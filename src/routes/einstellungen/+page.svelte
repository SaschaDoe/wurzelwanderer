<script lang="ts">
	import { onMount } from 'svelte';
	import { getApiKey, setApiKey, clearApiKey, hasApiKey, listAvailableModels } from '$lib/services/geminiService';

	let apiKeyInput = $state('');
	let apiKeyGespeichert = $state(false);
	let showKey = $state(false);
	let envKeyVorhanden = $state(false);
	let modelsLaden = $state(false);

	// Load on mount
	onMount(async () => {
		const envKey = import.meta.env.VITE_GEMINI_API_KEY;
		envKeyVorhanden = !!(envKey && envKey !== 'your_api_key_here');

		const savedKey = await getApiKey();
		if (savedKey) {
			apiKeyInput = savedKey;
			apiKeyGespeichert = true;
		}
	});

	async function speichereKey() {
		if (apiKeyInput.trim()) {
			await setApiKey(apiKeyInput.trim());
			apiKeyGespeichert = true;
		}
	}

	async function loescheKey() {
		await clearApiKey();
		apiKeyInput = '';
		apiKeyGespeichert = false;
	}

	function maskKey(key: string): string {
		if (key.length <= 8) return '********';
		return key.substring(0, 4) + '****' + key.substring(key.length - 4);
	}

	async function pruefeModels() {
		modelsLaden = true;
		try {
			await listAvailableModels();
		} finally {
			modelsLaden = false;
		}
	}
</script>

<svelte:head>
	<title>Einstellungen - Wurzelwanderer</title>
</svelte:head>

<div class="container">
	<h1>Einstellungen</h1>
	<p class="intro">
		Konfiguriere hier die KI-Funktionen für Wurzelwanderer.
	</p>

	<section class="settings-section">
		<h2>Gemini API Key</h2>
		<p class="section-description">
			Der API Key wird für die KI-Bildgenerierung bei Bekannten benötigt.
			Du kannst einen kostenlosen Key bei <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">Google AI Studio</a> erstellen.
		</p>

		{#if envKeyVorhanden}
			<div class="env-notice">
				<span class="env-badge">DEV</span>
				Ein API Key wurde über die Environment Variable <code>VITE_GEMINI_API_KEY</code> erkannt und wird automatisch verwendet.
			</div>
		{/if}

		<div class="api-key-form">
			<div class="input-group">
				<label for="api-key">API Key</label>
				<div class="input-with-toggle">
					{#if showKey}
						<input
							type="text"
							id="api-key"
							bind:value={apiKeyInput}
							placeholder="AIza..."
							class="api-key-input"
						/>
					{:else}
						<input
							type="password"
							id="api-key"
							bind:value={apiKeyInput}
							placeholder="AIza..."
							class="api-key-input"
						/>
					{/if}
					<button
						type="button"
						class="toggle-visibility"
						onclick={() => showKey = !showKey}
						title={showKey ? 'Key verstecken' : 'Key anzeigen'}
					>
						{showKey ? '🙈' : '👁️'}
					</button>
				</div>
			</div>

			<div class="button-group">
				<button
					class="btn btn-primary"
					onclick={speichereKey}
					disabled={!apiKeyInput.trim()}
				>
					{apiKeyGespeichert ? 'Key aktualisieren' : 'Key speichern'}
				</button>
				{#if apiKeyGespeichert}
					<button class="btn btn-danger" onclick={loescheKey}>
						Key löschen
					</button>
				{/if}
			</div>

			{#if apiKeyGespeichert}
				<p class="success-message">
					API Key ist gespeichert und einsatzbereit.
				</p>
			{/if}
		</div>

		<div class="info-box">
			<h4>Hinweise zur Sicherheit</h4>
			<ul>
				<li>Der API Key wird nur lokal in deinem Browser gespeichert</li>
				<li>Er wird niemals an unsere Server gesendet</li>
				<li>Für Entwickler: Lege den Key in einer <code>.env</code> Datei ab</li>
				<li>Die <code>.env</code> Datei wird nicht in Git hochgeladen</li>
			</ul>
		</div>
	</section>

	<section class="settings-section">
		<h2>API Diagnose</h2>
		<p class="section-description">
			Prüfe welche Models mit deinem API Key verfügbar sind. Die Ergebnisse erscheinen in der Browser-Konsole (F12).
		</p>
		<button
			class="btn btn-secondary"
			onclick={pruefeModels}
			disabled={modelsLaden || !hasApiKey()}
		>
			{#if modelsLaden}
				Models werden geladen...
			{:else}
				Verfügbare Models prüfen
			{/if}
		</button>
		{#if !hasApiKey()}
			<p class="hint-text">Speichere zuerst einen API Key.</p>
		{/if}
	</section>

	<section class="settings-section">
		<h2>Über die Bildgenerierung</h2>
		<p>
			Die Bildgenerierung verwendet Google Gemini, um einzigartige Illustrationen
			für deine Bekannten im Stil von Fritz Baumgarten zu erstellen - der berühmten
			deutschen Kinderbuchillustration mit märchenhaften Tierwesen.
		</p>

		<div class="warning-box">
			<h4>Regionale Einschränkungen</h4>
			<p>
				Google hat die Gemini Image Generation in Europa eingeschränkt.
				Wenn du die Fehlermeldung "Image generation is not available in your country" erhältst,
				ist dein Standort leider nicht unterstützt.
			</p>
			<p>
				<strong>Mögliche Workarounds:</strong>
			</p>
			<ul>
				<li>VPN zu einem unterstützten Land verwenden (z.B. USA)</li>
				<li>Warten bis Google die Einschränkungen aufhebt</li>
			</ul>
		</div>

		<p>
			<strong>Hinweis:</strong> Die Bildgenerierung benötigt eine aktive Internetverbindung
			und verbraucht API-Kontingent bei Google.
		</p>
	</section>
</div>

<style>
	.intro {
		font-size: 1.1rem;
		color: var(--color-earth);
		margin-bottom: var(--space-lg);
	}

	.settings-section {
		background: var(--color-parchment);
		padding: var(--space-lg);
		border-radius: var(--radius-lg);
		margin-bottom: var(--space-lg);
	}

	.settings-section h2 {
		margin-top: 0;
		margin-bottom: var(--space-sm);
	}

	.section-description {
		color: var(--color-earth);
		margin-bottom: var(--space-md);
	}

	.section-description a {
		color: var(--color-leaf-dark);
		font-weight: 600;
	}

	.env-notice {
		background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
		padding: var(--space-md);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-md);
		border-left: 4px solid var(--color-leaf);
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.env-badge {
		background: var(--color-leaf);
		color: white;
		padding: 2px 8px;
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		font-weight: 700;
	}

	.api-key-form {
		margin-bottom: var(--space-lg);
	}

	.input-group {
		margin-bottom: var(--space-md);
	}

	.input-group label {
		display: block;
		font-weight: 600;
		margin-bottom: var(--space-xs);
		color: var(--color-earth-dark);
	}

	.input-with-toggle {
		display: flex;
		gap: var(--space-xs);
	}

	.api-key-input {
		flex: 1;
		padding: var(--space-sm) var(--space-md);
		border: 2px solid var(--color-earth-light);
		border-radius: var(--radius-md);
		font-size: 1rem;
		font-family: monospace;
	}

	.api-key-input:focus {
		outline: none;
		border-color: var(--color-leaf);
	}

	.toggle-visibility {
		padding: var(--space-sm);
		border: 2px solid var(--color-earth-light);
		border-radius: var(--radius-md);
		background: var(--color-cream);
		cursor: pointer;
		font-size: 1.2rem;
	}

	.toggle-visibility:hover {
		background: var(--color-earth-light);
	}

	.button-group {
		display: flex;
		gap: var(--space-md);
		flex-wrap: wrap;
	}

	.btn-danger {
		background: #dc3545;
		color: white;
		border: none;
	}

	.btn-danger:hover {
		background: #c82333;
	}

	.success-message {
		margin-top: var(--space-md);
		padding: var(--space-sm) var(--space-md);
		background: #d4edda;
		border: 1px solid #c3e6cb;
		border-radius: var(--radius-md);
		color: #155724;
	}

	.info-box {
		background: var(--color-cream);
		padding: var(--space-md);
		border-radius: var(--radius-md);
		border: 1px dashed var(--color-earth-light);
	}

	.info-box h4 {
		margin: 0 0 var(--space-sm) 0;
		font-size: 0.95rem;
	}

	.info-box ul {
		margin: 0;
		padding-left: var(--space-lg);
	}

	.info-box li {
		margin-bottom: var(--space-xs);
		font-size: 0.9rem;
		color: var(--color-earth);
	}

	.info-box code {
		background: var(--color-parchment);
		padding: 2px 6px;
		border-radius: var(--radius-sm);
		font-size: 0.85rem;
	}

	.hint-text {
		font-size: 0.9rem;
		color: var(--color-earth);
		margin-top: var(--space-sm);
		font-style: italic;
	}

	.warning-box {
		background: linear-gradient(135deg, #fff3cd, #ffeeba);
		padding: var(--space-md);
		border-radius: var(--radius-md);
		margin: var(--space-md) 0;
		border-left: 4px solid #ffc107;
	}

	.warning-box h4 {
		margin: 0 0 var(--space-sm) 0;
		color: #856404;
		font-size: 0.95rem;
	}

	.warning-box p {
		margin: 0 0 var(--space-sm) 0;
		color: #856404;
		font-size: 0.9rem;
	}

	.warning-box ul {
		margin: 0;
		padding-left: var(--space-lg);
	}

	.warning-box li {
		margin-bottom: var(--space-xs);
		font-size: 0.9rem;
		color: #856404;
	}
</style>
