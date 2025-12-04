// Shared Merkmal data for Bekannte generation

import { getRandomElement } from "$lib/utils/random";

export interface Merkmal {
	name: string;
	beschreibung: string;
	berufe: string[];
	aktionen: string[];
	magisch?: boolean;
	trauma?: boolean;
}

export interface MerkmalKategorie {
	name: string;
	merkmale: Merkmal[];
}

export const bodenstaendigeMerkmale: Merkmal[] = [
	{
		name: 'Ehrlich',
		beschreibung: 'Ehrliche Bekannte sagen immer, was ihnen auf dem Herzen liegt.',
		berufe: ['Tuchmacher*in', 'Buchbinder*in', 'Notar*in', 'Richter*in', 'Chronist*in', 'Marktaufseher*in', 'Beichtvater/-mutter', 'Schiedsrichter*in', 'Prüfer*in', 'Gutachter*in', 'Gewissenswächter*in', 'Zeuge/Zeugin'],
		aktionen: [
			'Die Fakten so darlegen, wie du sie siehst.',
			'Auf die Wahrheit hinweisen, die alle anderen ignoriert haben.',
			'Fragen: „Willst du meine Meinung hören?"'
		]
	},
	{
		name: 'Still',
		beschreibung: 'Stille Bekannte haben nicht viel zu sagen.',
		berufe: ['Kolporteur*in', 'Glasbläser*in', 'Pilzsammler*in', 'Kopist*in', 'Kerzenzieher*in', 'Nachtportier*in', 'Bibliotheksgehilf*in', 'Totengräber*in', 'Fischer*in am See', 'Nachtwandler*in', 'Schattendiener*in', 'Stumme*r Mönch/Nonne'],
		aktionen: [
			'Jemandem auf die Schulter tippen.',
			'Eine Person so lange anstarren, bis sie begreift.',
			'Ohne Worte fragen: „Geht es dir gut?"'
		]
	},
	{
		name: 'Wachsam',
		beschreibung: 'Wachsame Bekannte behalten die Welt um sich herum genau im Auge.',
		berufe: ['Wache', 'Leuchtturmwärter*in', 'Grenzposten', 'Nachtwächter*in', 'Vogelbeobachter*in', 'Waldläufer*in', 'Späherin', 'Turmwächter*in', 'Hafenmeister*in', 'Hirte/Hirtin', 'Feuerwache', 'Laternenwärter*in'],
		aktionen: [
			'Auf etwas hinweisen, das anderen entgangen ist.',
			'Den Ausgang bewachen.',
			'Fragen: „Was versteckst du?"'
		]
	},
	{
		name: 'Weise',
		beschreibung: 'Weise Bekannte haben viel gelernt, indem sie zugehört haben und durch die Welt gezogen sind.',
		berufe: ['Ordensleute', 'Kräuterkundige', 'Dorfälteste*r', 'Einsiedler*in', 'Pilger*in', 'Brunnenmeister*in', 'Großmutter/Großvater', 'Müller*in', 'Alte*r Gärtner*in', 'Ruheständler*in', 'Geschichtenbewahrer*in', 'Dorfheiler*in'],
		aktionen: [
			'Etwas reflektieren, das jemand anders gesagt hat.',
			'Einen Weg vorschlagen, der sehr anders ist als jene, die schon vorgeschlagen wurden.',
			'Fragen: „Was denkst du denn über die Sache?"'
		]
	},
	{
		name: 'Unsichtbar',
		magisch: true,
		beschreibung: 'Unsichtbare Bekannte sind nicht sichtbar.',
		berufe: ['Gespenstisches Geistwesen', 'Furchtsame Gottheit', 'Winzige krabbelnde Kreatur', 'Flüsternder Wind', 'Vergessener Hausgeist', 'Dieb*in im Schatten', 'Lauscher*in an der Wand', 'Geheimkurier*in', 'Vergessene*r Diener*in', 'Mausegroßer Späher', 'Staubkornreisende*r', 'Niemand'],
		aktionen: [
			'Schon die ganze Zeit unbemerkt da gewesen sein.',
			'Direkt an den Leuten vorbeikommen, die dich eigentlich sehen sollten.',
			'Verschwinden.'
		]
	},
	{
		name: 'Verflochten',
		magisch: true,
		beschreibung: 'Verflochtene Bekannte sind in der Welt um sie herum verwurzelt und ebenso Teil der Bäume und des Himmels wie eigene Wesen.',
		berufe: ['Nachdenkliche Schaman*in', 'Gottheit versteckter Orte', 'Dem Land Horchende', 'Waldseele', 'Quellengeist', 'Wünschelrutengänger*in', 'Erdflüsterer*in', 'Wetterkundige*r', 'Pilzmyzel-Lauscher*in', 'Wandernder Kompost', 'Lebende Hecke', 'Ökosystemhüter*in'],
		aktionen: [
			'Aufzeigen, wie zwei Dinge auf unerwartete Weise miteinander verbunden sind.',
			'Dir Zeit lassen und dich sehr vorsichtig bewegen.',
			'Einer Person helfen, die Welt um sie herum um Rat zu fragen.'
		]
	}
];

export const charakterMerkmale: Merkmal[] = [
	{
		name: 'Entspannt',
		beschreibung: 'Entspannte Bekannte sind gelöst und immer gelassen.',
		berufe: ['Fischer*in', 'Brauer*in', 'Schlendrian', 'Teemeister*in', 'Schäfer*in', 'Gärtner*in', 'Bademeister*in', 'Hängemattentester*in', 'Wolkenbeobachter*in', 'Rentner*in am Fluss', 'Kneipenwirt*in', 'Langsame*r Bote'],
		aktionen: [
			'Die Dinge nehmen, wie sie kommen.',
			'Alle daran erinnern, einen Schritt zurückzumachen.',
			'Fragen: „Willst du darüber reden?"'
		]
	},
	{
		name: 'Frohgemut',
		beschreibung: 'Frohgemute Bekannte sind glücklich und positiv.',
		berufe: ['Bäcker*in', 'Köch*in', 'Konditor*in', 'Blumenhändler*in', 'Spielzeugmacher*in', 'Festorganisator*in', 'Imker*in', 'Zirkusclown', 'Kindermädchen', 'Marktmusikant*in', 'Sonntagsausrufer*in', 'Glücksbringer*in'],
		aktionen: [
			'Die Sache positiv sehen.',
			'Eine fröhliche Melodie pfeifen.',
			'Dich in eine peinliche Situation flirten.'
		]
	},
	{
		name: 'Grüblerisch',
		beschreibung: 'Grüblerische Bekannte haben viele schwierige Gedanken im Kopf.',
		berufe: ['Buchdrucker*in', 'Winzer*in', 'Glöckner*in', 'Uhrmacher*in', 'Schachspieler*in', 'Friedhofsgärtner*in', 'Archivar*in', 'Nachtschreiber*in', 'Philosoph*in ohne Schüler', 'Alte*r Leuchtturmwärter*in', 'Einsiedlermönch', 'Regenwurmbauer'],
		aktionen: [
			'Jemandem den Spaß verderben.',
			'Traurig in die Ferne starren.',
			'Fragen: „Was können wir denn sonst tun?"'
		]
	},
	{
		name: 'Selbstsicher',
		beschreibung: 'Selbstsichere Bekannte wissen genau, wer sie sind und wer sie sein wollen.',
		berufe: ['Schmied*in', 'Viehtreiber*in', 'Stallmeister*in', 'Jäger*in', 'Kapitän*in', 'Meisterbauer*in', 'Brückenwächter*in', 'Anführer*in der Karawane', 'Erste*r Gehilf*in', 'Dorfvorsteher*in', 'Auktionator*in', 'Älteste*r Gesell*in'],
		aktionen: [
			'Hals über Kopf handeln.',
			'Dich in eine Situation werfen, ohne die Risiken zu verstehen.',
			'Sagen: „Ich hab das im Griff."'
		]
	},
	{
		name: 'Ehrwürdig',
		magisch: true,
		beschreibung: 'Ehrwürdige Bekannte sind so alt wie die Berge und die Erde selbst.',
		berufe: ['Berggottheit', 'Assel aus uralten Zeiten', 'Wesen aus der alten Dunkelheit', 'Uralter Baumgeist', 'Ewige Quelle', 'Hüter*in der Ruinen', 'Letzte*r Zeitzeugin', 'Lebende Mumie', 'Steinalter Pilger', 'Vergessene Statue', 'Ewiger Torwächter', 'Urgroßmutter der Welt'],
		aktionen: [
			'Etwas anbieten, das seit sehr langer Zeit niemand gesehen hat.',
			'Zeigen, wie es in härteren Zeiten war.',
			'Einer Person sagen, wie sie die Fehler der Vergangenheit wiederholen wird.'
		]
	},
	{
		name: 'Leuchtend',
		magisch: true,
		beschreibung: 'Leuchtende Bekannte sind voller Licht, das seinen Schein über die Welt breitet.',
		berufe: ['Gefallener Stern', 'Glühwürmchen', 'Morgenröte', 'Irrlichthüter*in', 'Laternenmacher*in', 'Leuchtturmhüter*in', 'Fackelträger*in', 'Spiegelmacher*in', 'Feuerjongleur*in', 'Glasschleifer*in', 'Hoffnungsbringer*in', 'Nachtjäger*in mit Laterne'],
		aktionen: [
			'Licht auf die Schatten der Welt scheinen lassen.',
			'Die Richtung weisen.',
			'Ohne Worte fragen: „Welche Wahrheit über dich versteckst du vor allen anderen?"'
		]
	}
];

export const intellektuelleMerkmale: Merkmal[] = [
	{
		name: 'Ehrgeizig',
		beschreibung: 'Ehrgeizige Bekannte haben Ziele und Bestrebungen, die über ihre aktuelle Lebenssituation hinausreichen.',
		berufe: ['Schreiberling', 'Lehrling', 'Hofanwärter*in', 'Gildenanwärter*in', 'Botschaftspage', 'Junger Händler', 'Aufstrebende*r Politiker*in', 'Erbe/Erbin mit Plänen', 'Ehrgeizige*r Köch*in', 'Hungriger Künstler', 'Zweiter Sohn/Tochter', 'Träumende*r Bauer/Bäuerin'],
		aktionen: [
			'Ein kalkuliertes Risiko eingehen.',
			'Erklären, wieso du die einzige Person bist, die etwas erledigen kann.',
			'Fragen: „Wie würdest du die Dinge besser machen?"'
		]
	},
	{
		name: 'Gelehrt',
		beschreibung: 'Gelehrte Bekannte haben viel Zeit mit Texten und traditioneller Bildung verbracht.',
		berufe: ['Professor*in', 'Bibliothekar*in', 'Apotheker*in', 'Übersetzer*in', 'Historiker*in', 'Klostergelehrte*r', 'Dorfschullehrer*in', 'Privatlehrer*in', 'Buchhändler*in', 'Pergamentrestaurator*in', 'Tintenmischer*in', 'Lesender Mönch/Nonne'],
		aktionen: [
			'Auf einen Text verweisen, den hier noch niemand anders gelesen hat.',
			'Etwas Nützliches wissen, das auf die Situation anwendbar ist.',
			'Fragen: „Willst du meinen Rat?"'
		]
	},
	{
		name: 'Listig',
		beschreibung: 'Listige Bekannte haben die Fähigkeit, Ereignisse und Situationen zu ihren Gunsten zu drehen.',
		berufe: ['Gassenkind', 'Trickbetrüger*in', 'Schmuggler*in', 'Falschspieler*in', 'Spion*in', 'Taschendieb*in', 'Marktschreier*in', 'Schlitzohriger Händler', 'Heiratsschwindler*in', 'Quacksalber*in', 'Falscher Prinz/Prinzessin', 'Geschickter Ausredenerfinder'],
		aktionen: [
			'Irgendwo hinkommen, wo du nicht sein solltest.',
			'Eine überzeugende Lüge erzählen.',
			'Fragen: „Was willst du hier wirklich erreichen?"'
		]
	},
	{
		name: 'Wissbegierig',
		beschreibung: 'Wissbegierige Bekannte greifen nach jeder Information, die sie finden können.',
		berufe: ['Journalist*in', 'Alchemist*in', 'Naturforscher*in', 'Sammler*in', 'Kartenmacher*in', 'Rätselknacker*in', 'Neugieriges Kind', 'Klatschbase', 'Inventarisierer*in', 'Schatzsucher*in', 'Gerüchtesammler*in', 'Fragensteller*in'],
		aktionen: [
			'Sich auf ein unwichtiges Detail konzentrieren.',
			'Etwas näher beleuchten.',
			'Fragen: „Was ist das?"'
		]
	},
	{
		name: 'Hexenhaft',
		magisch: true,
		beschreibung: 'Hexenhafte Bekannte beherrschen stille und trickreiche Magie.',
		berufe: ['Heiler*in', 'Hofzauber*in', 'Nette alte Dame im Sumpf', 'Kräuterhexe', 'Tränkebrauer*in', 'Fluchbrecher*in', 'Pilzkundige', 'Giftmischer*in', 'Warzenentferner*in', 'Geburtshelferin mit Geheimwissen', 'Rattenfänger*in', 'Wurmflüsterer*in'],
		aktionen: [
			'Kichern.',
			'Verschiedene Komponenten vermischen, um etwas Neues zu erschaffen.',
			'Eine Person auf eine Charakterschwäche hinweisen.'
		]
	},
	{
		name: 'Prophetisch',
		magisch: true,
		beschreibung: 'Prophetische Bekannte können die Zukunft sehen, zum Guten wie zum Schlechten.',
		berufe: ['Verehrte Weise', 'Sternengucker*in', 'Orakelpriester*in', 'Kartenleser*in', 'Traumdeuter*in', 'Vogelschauer*in', 'Wettervorhersager*in', 'Kaffeesatzleser*in', 'Handliniendeuter*in', 'Bauernregelnkenner*in', 'Astrologin am Hof', 'Knochenwürfler*in'],
		aktionen: [
			'Eine vage und unklare Andeutung auf etwas machen, das noch nicht geschehen ist.',
			'Sagen: „Ich hab\'s dir doch gesagt."',
			'Einer Person die schlimmen Dinge erzählen, die ihre Zukunft für sie bereithält.'
		]
	}
];

export const koerperlicheMerkmale: Merkmal[] = [
	{
		name: 'Abenteuerlustig',
		beschreibung: 'Abenteuerlustige Bekannte wollen sich immer in etwas Neues verwickeln lassen.',
		berufe: ['Seeleute', 'Wandernde', 'Schatzsucher*in', 'Höhlenforscher*in', 'Karawanenreisende*r', 'Zirkusartist*in', 'Söldner*in', 'Grenzgänger*in', 'Wildwasserschiffer*in', 'Bärenjäger*in', 'Postbote in der Wildnis', 'Brückenbauer*in im Gebirge'],
		aktionen: [
			'Verkünden, wohin du als Nächstes gehen wirst.',
			'Dich Hals über Kopf in Schwierigkeiten stürzen.',
			'Die Umstände gegen jede Wahrscheinlichkeit auf deiner Seite haben.'
		]
	},
	{
		name: 'Entschlossen',
		beschreibung: 'Entschlossene Bekannte lassen sich nicht von ihrem derzeitigen Weg abbringen.',
		berufe: ['Architekt*in', 'Bergarbeiter*in', 'Deichbauer*in', 'Tunnelgräber*in', 'Brunnenbohrer*in', 'Sturköpfiger Bauer', 'Marathonläufer*in', 'Bergsteiger*in', 'Schuldeneintreiber*in', 'Detektiv*in', 'Widerstandskämpfer*in', 'Missionierende*r Priester*in'],
		aktionen: [
			'Etwas weiterverfolgen, das andere schon aufgegeben hätten.',
			'Zurückweisen, was direkt vor deinen Augen ist.',
			'Dich weigern, unter Druck aufzugeben.'
		]
	},
	{
		name: 'Leidenschaftlich',
		beschreibung: 'Leidenschaftliche Bekannte sind voller intensiver und explosiver Gefühle.',
		berufe: ['Briefträger*in durch Sturm und Regen', 'Weltenbummler*in', 'Pferdezüchter*in', 'Revolutionär*in', 'Feuertänzer*in', 'Liebesdichter*in', 'Eifersüchtiger Gärtner', 'Fanatischer Sammler', 'Verliebter Koch/Köchin', 'Obsessiver Maler', 'Besessene*r Erfinder*in', 'Ewiger Verlobter'],
		aktionen: [
			'Erklären, wieso dir etwas so wichtig ist.',
			'Genau das sagen, was dir gerade durch den Kopf geht.',
			'Deine Beherrschung verlieren und etwas Wichtiges beschädigen.'
		]
	},
	{
		name: 'Stark',
		beschreibung: 'Auf starke Bekannte ist in schlechten Zeiten Verlass.',
		berufe: ['Zimmerleute', 'Hafenarbeiter*in', 'Müller*in', 'Holzfäller*in', 'Lastenträger*in', 'Steinbrecher*in', 'Ankerschmied*in', 'Ringende*r', 'Beschützer*in', 'Türsteher*in', 'Fassträger*in', 'Rettungstaucher*in'],
		aktionen: [
			'Etwas stützen, das zusammenzubrechen droht.',
			'Etwas Beunruhigendes beiseiteschieben.',
			'Dich verausgaben um jemanden zu beschützen.'
		]
	},
	{
		name: 'Machtvoll',
		magisch: true,
		beschreibung: 'Machtvolle Bekannte haben Kraft, die über normale Fähigkeiten hinausgeht.',
		berufe: ['Mächtige Krieger*in', 'Herkulische Gottheit', 'Monster aus vergessenen Legenden', 'Titanenblut', 'Sturmrufer*in', 'Riesiger Schmied', 'Unbesiegbarer Champion', 'Legendärer Holzfäller', 'Stärkste*r im Dorf', 'Mythischer Ringer', 'Felsenbrecher*in', 'Wellenbändiger*in'],
		aktionen: [
			'Eine schwere Bürde auf dich nehmen.',
			'Das Unverrückbare bewegen.',
			'Etwas im Boden verankern.'
		]
	},
	{
		name: 'Wild',
		magisch: true,
		beschreibung: 'Wilde Bekannte lehnen die traditionelle Gesellschaft ab und umarmen das Monströse.',
		berufe: ['Furchterregendes Insekt', 'Hungrige Gottheit', 'Von der Wildnis großgezogenes Kind', 'Wolfsläufer*in', 'Dornengeist', 'Ausgestoßene*r Jäger*in', 'Verwilderter Einsiedler', 'Tollwütiger Wanderer', 'Verrückter Waldmensch', 'Höhlenbewohner*in', 'Barfüßiger Waldläufer', 'Unbezähmbare Bestie'],
		aktionen: [
			'Nach dem Wilden rufen und eine Antwort erhalten.',
			'Fragen: „Was hält dich auf?"',
			'All deine Zähne zeigen und zubeißen.'
		]
	}
];

export const kuenstlerischeMerkmale: Merkmal[] = [
	{
		name: 'Dramatisch',
		beschreibung: 'Dramatische Bekannte lieben es, sich zur Schau zu stellen.',
		berufe: ['Sänger*in', 'Klatschmaul', 'Salonlöw*in', 'Theaterdirektor*in', 'Opernsänger*in', 'Hofnarr', 'Tragöd*in', 'Prediger*in', 'Auktionsrufer*in', 'Marktschreier*in', 'Übertreibende*r Geschichtenerzähler*in', 'Aufschneider*in'],
		aktionen: [
			'Eine große Darbietung voller übersteigerter Emotionen und Theatralik abhalten.',
			'Jemanden durch das Zurschaustellen eines Talents ablenken.',
			'Deine Emotionen auf eine absurde Höhe schrauben.'
		]
	},
	{
		name: 'Fantasievoll',
		beschreibung: 'Fantasievolle Bekannte haben den Kopf immer in den Wolken.',
		berufe: ['Künstler*in', 'Träumer*in', 'Geschichtenerfinder*in', 'Puppentheater*in', 'Kinderbuchillustrator*in', 'Tagträumer*in', 'Luftschlossarchitekt*in', 'Verrückter Professor', 'Phantast*in', 'Ideenspinner*in', 'Märchenonkel/-tante', 'Spielerfinder*in'],
		aktionen: [
			'Erklären, auf welche Art die Dinge besser sein könnten.',
			'Etwas sehr Wichtiges vergessen.',
			'Einen Gebrauchsgegenstand auf eine Weise beschreiben, über die noch nie jemand nachgedacht hat.'
		]
	},
	{
		name: 'Gewieft',
		beschreibung: 'Gewiefte Bekannte sind sehr geschickt darin, alle Teile auf eine unkonventionelle Weise zusammenzusetzen.',
		berufe: ['Tüftler*in', 'Zauberkünstler*in', 'Puzzlemacher*in', 'Uhrwerksmeister*in', 'Erfinder*in', 'Schlossknacker*in', 'Improvisationskünstler*in', 'Flickschuster*in', 'Problemlöser*in', 'Bastler*in', 'Alleswisser*in', 'Jongleur*in'],
		aktionen: [
			'Etwas vollkommen Neues erfinden.',
			'Einen anderen Ansatz vorschlagen.',
			'Enthüllen, dass ein Plan sich ausgezahlt hat, den du in Gang gesetzt hattest.'
		]
	},
	{
		name: 'Poetisch',
		beschreibung: 'Poetische Bekannte haben eine große Liebe zu Wortspielen und Lyrik.',
		berufe: ['Schriftsteller*in', 'Reimeschmied*in', 'Minnesänger*in', 'Kalligraph*in', 'Liedermacher*in', 'Hofdichter*in', 'Briefeschreiber*in', 'Totenredner*in', 'Hochzeitsredner*in', 'Grabsteinmetz*in', 'Liebesbriefschreiber*in', 'Wortsammler*in'],
		aktionen: [
			'Im übertragenen Sinne etwas polieren.',
			'Sich in der Gesamtsituation verlieren.',
			'Ratschläge geben, was eine andere Person sagen sollte.'
		]
	},
	{
		name: 'Glamourös',
		magisch: true,
		beschreibung: 'Glamouröse Bekannte haben eine betörende und verzaubernde Erscheinung.',
		berufe: ['Koketter Daemon', 'Make-up-Künstler*in', 'Schönheitsgeist', 'Blendwerk', 'Hofschönheit', 'Modell', 'Verführer*in', 'Prunkvoller Pfau', 'Schillernder Schmetterling', 'Maskenbauer*in', 'Kostümschneider*in', 'Juwelier*in'],
		aktionen: [
			'Alle blenden und verblüffen, die dich erblicken.',
			'Das Aussehen enthüllen, was du darunter verbirgst.',
			'Eine Person auffordern, dich anzusehen.'
		]
	},
	{
		name: 'Wundertätig',
		magisch: true,
		beschreibung: 'Wundertätige Bekannte können Dinge tun, die anderen unmöglich sind.',
		berufe: ['Große mächtige Gottheit', 'Machtvolle Zauber*in', 'Wunscherfüllender Fisch', 'Märchenfee', 'Wunderheiler*in', 'Regenmacher*in', 'Glückliche Hand des Dorfes', 'Segnende Großmutter', 'Berührte*r Heilige*r', 'Wundersame*r Gärtner*in', 'Unmöglicher Handwerker', 'Traumverwirklicher*in'],
		aktionen: [
			'Das Unmögliche möglich machen.',
			'Eine Person an die Hand nehmen und mit ihr fliegen.',
			'Einer Person anbieten, ihr einen Wunsch zu erfüllen.'
		]
	}
];

export const sozialeMerkmale: Merkmal[] = [
	{
		name: 'Ausgelassen',
		beschreibung: 'Ausgelassene Bekannte sind immer auf der Suche nach Spaß.',
		berufe: ['Zecher*in', 'Spaßvogel', 'Festmusikant*in', 'Jahrmarktgaukler*in', 'Tanzbär', 'Partyorganisator*in', 'Schelm*in', 'Spielleiter*in', 'Tavernenunterhalter*in', 'Stimmungsmacher*in', 'Karnevalsprinz/-prinzessin', 'Feiernder Student'],
		aktionen: [
			'Das Spaßige an einer langweiligen Aufgabe finden.',
			'Dich in der Begeisterung verlieren.',
			'Genau wissen, wo gerade die bessere Party stattfindet.'
		]
	},
	{
		name: 'Freundlich',
		beschreibung: 'Freundliche Bekannte kommen mit jeder Art von Leuten gut klar.',
		berufe: ['Schankwirt*in', 'Barbier*in', 'Bard*in', 'Postmeister*in', 'Herbergsleiter*in', 'Dorfkrämer*in', 'Fährmann/-frau', 'Begrüßer*in', 'Netter Nachbar', 'Vermittler*in', 'Dorfplatzfigur', 'Allseits Bekannte*r'],
		aktionen: [
			'Mit jemandem ein Gespräch anfangen.',
			'Eine Person deinen alten Freund*innen vorstellen.',
			'Dein Herz an einen unbelebten Gegenstand hängen.'
		]
	},
	{
		name: 'Fürsorglich',
		beschreibung: 'Fürsorgliche Bekannte würden sterben, um andere in Sicherheit zu wissen.',
		berufe: ['Ärzt*in', 'Hebamme', 'Krankenpfleger*in', 'Waisenhausleiter*in', 'Tierheiler*in', 'Armenküchenbetreiber*in', 'Großmutter des Dorfes', 'Pflegemutter/-vater', 'Suppenküchenbetreiber*in', 'Obdachlosenhelfer*in', 'Sorgende*r Nachbar*in', 'Kümmerer*in'],
		aktionen: [
			'Eine andere Person vor der Welt beschützen.',
			'Dich selbst in Schwierigkeiten bringen, um jemand anderem zu helfen.',
			'Fragen: „Was brauchst du jetzt gerade?"'
		]
	},
	{
		name: 'Korrekt',
		beschreibung: 'Korrekte Bekannte achten auf Förmlichkeit und Traditionen.',
		berufe: ['Leibdiener*in', 'Haushofmeister*in', 'Zeremonienmeister*in', 'Protokollführer*in', 'Etikettenlehrer*in', 'Zunftmeister*in', 'Pedantischer Buchhalter', 'Strenger Türsteher', 'Ordnungshüter*in', 'Traditionswächter*in', 'Regelbewahrer*in', 'Pünktlicher Bote'],
		aktionen: [
			'Erklären, wie man Dinge in der Vergangenheit geregelt hat.',
			'Etwas verurteilen, weil es unangemessen ist.',
			'Schwierigkeiten haben, etwas Neues zu verstehen.'
		]
	},
	{
		name: 'Empathisch',
		magisch: true,
		beschreibung: 'Empathische Bekannte können Verständnis und Verbundenheit zu Dingen aufbauen, wie es niemand sonst vermag.',
		berufe: ['Sanfte Lehrer*in', 'Liebevolles Geistwesen', 'Verstehende Person', 'Seelentröster*in', 'Herzensleser*in', 'Guter Zuhörer', 'Verständnisvolle Hebamme', 'Mitfühlender Priester', 'Tierflüsterer*in', 'Kinderversteher*in', 'Konfliktvermittler*in', 'Beichthörer*in'],
		aktionen: [
			'Mit etwas kommunizieren, dass eigentlich nicht sprechen kann.',
			'Ein Konzept so ausdrücken, dass es alle verstehen.',
			'Ohne Worte fragen: „Was empfindest du?"'
		]
	},
	{
		name: 'Vielgesichtig',
		magisch: true,
		beschreibung: 'Vielgesichtige Bekannte sind Gestaltwandelnde, die andere Formen annehmen können.',
		berufe: ['Trickreiche Gottheit', 'Raffinierte Dieb*in', 'Geschulte Imitator*in', 'Maskenträger*in', 'Wechselbalg', 'Schauspieler*in', 'Doppelgänger*in', 'Chamäleon', 'Betrügerisches Spiegelbild', 'Rollenspieler*in', 'Undercover-Ermittler*in', 'Meisterverkleidung'],
		aktionen: [
			'Dich eingehend verändern und etwas Neues werden.',
			'Enthüllen, dass du dich die ganze Zeit als ein*e andere*r Bekannte*r ausgegeben hast.',
			'Genau wie eine andere Figur aussehen.'
		]
	}
];

export const traumaMerkmale: Merkmal[] = [
	{
		name: 'Darbend',
		trauma: true,
		beschreibung: 'Darbenden Bekannten wurde zu lange verweigert, ihren Hunger zu stillen.',
		berufe: ['Hungriger Ghul', 'Schatten monströser Gottheit', 'Ausgehungerter Bettler', 'Vergessener Diener', 'Gieriges Wesen', 'Ewiger Bittsteller', 'Verarmter Adliger', 'Brotloser Künstler', 'Hungriger Waisenknabe', 'Verhungernde*r Witwe/Witwer', 'Ausgezehrte*r Wanderer*in', 'Neidischer Nachbar'],
		aktionen: [
			'An den Resten nagen.',
			'Der falschen Person die Schuld für deinen Hunger geben.',
			'Eine Person, Ort, Gegenstand oder Geheimnis benennen.'
		]
	},
	{
		name: 'Hektisch',
		trauma: true,
		beschreibung: 'Hektische Bekannte mühen sich ab, um alles zu schaffen.',
		berufe: ['Überlastete Hüter*in', 'Getriebene Intellektuelle', 'Ruheloser Bote', 'Gehetzte Magd', 'Überarbeiteter Handwerker', 'Rastloser Händler', 'Alleinerziehende Mutter/Vater', 'Überforderter Lehrling', 'Schlafloser Wächter', 'Mehrfachjobber*in', 'Besorgter Arzt', 'Gestrester Koch'],
		aktionen: [
			'Etwas Gefährlichem oder Riskantem zustimmen.',
			'Zu viele Dinge gleichzeitig sagen wollen.',
			'Dich gegen deinen Instinkt zur Wehr setzen und eine Pause machen.'
		]
	},
	{
		name: 'Heroisch',
		trauma: true,
		beschreibung: 'Heroische Bekannte glauben, dass sie zur Rettung der Welt auserkoren sind.',
		berufe: ['Drachentöter*in', 'Anführende der Rebellion', 'Selbsternannter Retter', 'Verblendeter Kreuzritter', 'Größenwahnsinniger Prinz', 'Besserwissender Anführer', 'Unfehlbarer Prophet', 'Übermotivierter Wachposten', 'Selbstgerechter Priester', 'Möchtegern-Ritter', 'Naiver Idealist', 'Arroganter Erstgeborener'],
		aktionen: [
			'Wissen, was für alle anderen das Beste ist.',
			'Der Welt eine perfekte Rolle vorspielen.',
			'Jemanden für grundlegend gut oder unwiederbringlich schlecht erklären.'
		]
	},
	{
		name: 'Königlich',
		trauma: true,
		beschreibung: 'Königliche Bekannte herrschen über dieses Land mit Autorität und einsamer Erhabenheit.',
		berufe: ['Arroganter König', 'Turmhohe Gigant*in', 'Einsamer Thronfolger', 'Verbitterte Kaiserin', 'Tyrannischer Fürst', 'Gefallene Majestät', 'Isolierter Herrscher', 'Überheblicher Gutsherr', 'Verwöhntes Einzelkind', 'Hochnäsige*r Meister*in', 'Unnahbare*r Chef*in', 'Selbstherrlicher Patriarch'],
		aktionen: [
			'Dich auf eine kleinliche und nutzlose Machtdemonstration einlassen.',
			'Der Welt um dich herum deinen Willen aufzwingen.',
			'Eine weitreichende Bekanntmachung abgeben.'
		]
	},
	{
		name: 'Leer',
		trauma: true,
		beschreibung: 'Leere Bekannte fühlen sich, als wäre nicht mehr viel von ihnen übrig.',
		berufe: ['Kriegsgebeutelte Überlebende', 'Gequälte Veteran*in', 'Ausgehöhlt von Schmerz', 'Ausgebrannter Heiler', 'Erschöpfter Wanderer', 'Verbrauchter Held', 'Lebensmüder Alte', 'Abgestumpfter Totengräber', 'Emotionsloser Arbeiter', 'Verlassener Ehepartner', 'Enttäuschter Idealist', 'Gescheiterte Hoffnung'],
		aktionen: [
			'Seufzen und ins Leere starren.',
			'Fragen: „Ist das nicht egal?"',
			'Ein Gefühl ausdrücken, von dem du dachtest, du kannst es nicht mehr.'
		]
	},
	{
		name: 'Nervös',
		trauma: true,
		beschreibung: 'Nervöse Bekannte sind völlig gestresst.',
		berufe: ['Erschrockenes Kind', 'Überforderter Prinz', 'Überwältigte Person', 'Zitternder Lehrling', 'Verängstigter Bote', 'Unsicherer Erbe', 'Geplagter Diener', 'Ängstlicher Neuling', 'Panischer Prüfling', 'Nervöser Brautvater', 'Erstmaliger Redner', 'Überforderte*r Anfänger*in'],
		aktionen: [
			'Dir Sorgen um etwas machen, das du nicht kontrollieren kannst.',
			'Sagen: „Es tut mir leid."',
			'Fragen: „Ist alles in Ordnung?"'
		]
	},
	{
		name: 'Trauernd',
		trauma: true,
		beschreibung: 'Trauernde Bekannte betrauern die Lieben, die sie vor Kurzem verloren haben.',
		berufe: ['Eltern mit gebrochenem Herzen', 'Verwitweter Bauer', 'Kinderloser Ahne', 'Verlassener Liebhaber', 'Heimatloser Flüchtling', 'Trauernder Geselle', 'Zurückgelassene*r Partner*in', 'Bestattungsunternehmer*in in Trauer', 'Letzte*r Überlebende*r', 'Einsamer Friedhofswärter', 'Verwaister Lehrling', 'Vergessene Witwe'],
		aktionen: [
			'Von Gefühlen überflutet werden.',
			'Dich an etwas Tröstendes krallen und dich weigern, es loszulassen.',
			'Fragen: „Fühlst du dich gerade bereit, zuzuhören?"'
		]
	},
	{
		name: 'Tot',
		trauma: true,
		beschreibung: 'Tote Bekannte waren einmal am Leben, sind es aber nicht mehr.',
		berufe: ['Gespenstisches Licht', 'Wandernde Seele', 'Letztes Relikt einer vergangenen Zeit', 'Ruheloser Geist', 'Unerlöster Ahne', 'Verblichener Wächter', 'Spukendes Opfer', 'Vergessener Gründer', 'Toter Briefträger', 'Verstorbene Liebende', 'Getöteter Zeuge', 'Ermordeter Händler'],
		aktionen: [
			'Eine Brücke von einem Leben zum anderen bereiten.',
			'Jemandem einen Schauer über den Rücken jagen.',
			'Einer Person etwas zeigen, mit dem sie sich wirklich nicht herumschlagen will.'
		]
	},
	{
		name: 'Verloren',
		trauma: true,
		beschreibung: 'Verlorene Bekannte haben vergessen, wie sie wieder nach Hause finden.',
		berufe: ['Einsame Reisende', 'Verwirrte Prophet*in', 'Von der Welt Getrennte', 'Verirrter Pilger', 'Orientierungsloser Wanderer', 'Vergessener Bote', 'Abgekommener Suchender', 'Dementer Großvater', 'Verwirrte alte Frau', 'Amnesie-Patient*in', 'Entwurzelter Flüchtling', 'Schiffbrüchiger ohne Ziel'],
		aktionen: [
			'Tief in die Dunkelheit wandern.',
			'Ausdrücken, dass du dich von der Welt um dich herum losgelöst fühlst.',
			'Die Hilfe einer anderen Person suchen, um dir Stabilität zu geben.'
		]
	},
	{
		name: 'Versehrt',
		trauma: true,
		beschreibung: 'Versehrte Bekannte pflegen ihre Wunden, die niemals ganz verheilen werden.',
		berufe: ['Alte Held*in', 'Geplagte Patient*in', 'Von Schmerz Gezeichnete', 'Vernarbter Krieger', 'Hinkender Bote', 'Blinder Seher', 'Einarmiger Schmied', 'Tauber Musiker', 'Lahmer Tänzer', 'Brandnarbenträger*in', 'Amputierter Holzfäller', 'Verletzte*r Bergarbeiter*in'],
		aktionen: [
			'Bei der Bewegung einer anderen Person zusammenzucken.',
			'Eine alte Wunde wieder öffnen.',
			'Aussprechen, was ein Schritt auf dem Weg in Richtung Heilung sein kann.'
		]
	},
	{
		name: 'Vorsichtig',
		trauma: true,
		beschreibung: 'Vorsichtige Bekannte haben ihr letztes Vertrauen vor langer Zeit aufgebraucht.',
		berufe: ['Erschöpfte Witwe', 'Kaltherzige Bäuer*in', 'Härte der Welt Erfahrene', 'Misstrauischer Händler', 'Verschlossener Einsiedler', 'Abweisender Wirt', 'Betrogene Ehefrau', 'Hintergangener Geschäftspartner', 'Paranoider Hüter', 'Skeptischer Alter', 'Vorsichtiger Grenzgänger', 'Einmal Verratener'],
		aktionen: [
			'Auf eine Gefahr hinweisen, sei sie echt oder eingebildet.',
			'Dich weigern, dich einer anderen Person zu öffnen.',
			'Einen Schritt aus deiner Komfortzone machen, auch wenn er klein ist.'
		]
	},
	{
		name: 'Wütend',
		trauma: true,
		beschreibung: 'Wütende Bekannte können ihren Zorn nicht zurückhalten.',
		berufe: ['Rachedurstige Mutter', 'Soldat*in mit hasserfüllten Augen', 'Zur Waffe Gemachte', 'Verbitterter Schmied', 'Zorniger Rebell', 'Hasserfüllter Diener', 'Brodelnder Gefangener', 'Aufbrausender Jugendlicher', 'Geprellter Händler', 'Gekündigter Arbeiter', 'Betrogener Liebhaber', 'Ungerecht Verurteilter'],
		aktionen: [
			'Um dich schlagen, ohne es zu wollen.',
			'Alles runterschlucken und in dir brodeln lassen.',
			'Deinen Zorn auf eine konstruktive Weise ausdrücken.'
		]
	}
];

export const alleKategorien: MerkmalKategorie[] = [
	{ name: 'Bodenständig', merkmale: bodenstaendigeMerkmale },
	{ name: 'Charakter', merkmale: charakterMerkmale },
	{ name: 'Intellektuell', merkmale: intellektuelleMerkmale },
	{ name: 'Körperlich', merkmale: koerperlicheMerkmale },
	{ name: 'Künstlerisch', merkmale: kuenstlerischeMerkmale },
	{ name: 'Sozial', merkmale: sozialeMerkmale }
];

export const traumaKategorie: MerkmalKategorie = { name: 'Trauma', merkmale: traumaMerkmale };

// Tierwesen for names
export const tierwesen = [
	// Säugetiere
	'Maus', 'Hase', 'Dachs', 'Fuchs', 'Igel', 'Eichhörnchen', 'Otter', 'Biber',
	'Reh', 'Hirsch', 'Waschbär', 'Maulwurf', 'Wiesel', 'Marder', 'Ratte', 'Opossum',
	'Stinktier', 'Fledermaus', 'Hamster', 'Murmeltier', 'Hermelin', 'Hund', 'Katze', 'Wildschwein',
	// Vögel
	'Eule', 'Rabe', 'Krähe', 'Taube', 'Spatz', 'Meise', 'Rotkehlchen', 'Zaunkönig',
	'Amsel', 'Drossel', 'Star', 'Elster', 'Eisvogel', 'Specht', 'Schwalbe', 'Lerche',
	// Reptilien & Amphibien
	'Frosch', 'Kröte', 'Gecko', 'Schildkröte', 'Eidechse', 'Salamander', 'Molch', 'Schlange',
	// Insekten & Krabbeltiere
	'Ameise', 'Biene', 'Grille', 'Motte', 'Schmetterling', 'Libelle', 'Spinne', 'Schnecke',
	'Käfer', 'Hummel', 'Wespe', 'Glühwürmchen', 'Heuschrecke', 'Raupe', 'Tausendfüßler', 'Assel',
	// Fabelwesen & Kleine Völker
	'Wichtel', 'Zwerg', 'Kobold', 'Gnom', 'Schrat', 'Nixe', 'Elfe', 'Fee', 'Waldgeist', 'Pilzling'
];

// Namen nach Geschlecht und Kategorie
export const weiblicheNamen: Record<string, string[]> = {
	Bodenständig: [
		'Wurzel', 'Erde', 'Kiesel', 'Moos', 'Flechte', 'Rinde', 'Heide', 'Scholle',
		'Birke', 'Weide', 'Linde', 'Esche', 'Erle', 'Ulme', 'Buche', 'Tanne',
		'Hasel', 'Efeu', 'Farn', 'Distel', 'Nessel', 'Klee', 'Thymian', 'Salbei'
	],
	Charakter: [
		'Sonne', 'Luna', 'Aurora', 'Stella', 'Freya', 'Greta', 'Heidi', 'Alma', 'Ida', 'Thea',
		'Helga', 'Inga', 'Liv', 'Solveig', 'Ylva', 'Astrid', 'Gudrun', 'Sigrun', 'Frida', 'Maja'
	],
	Intellektuell: [
		'Minerva', 'Athene', 'Sophie', 'Clara', 'Helena', 'Vera', 'Nora', 'Edda', 'Saga', 'Irma',
		'Cordelia', 'Pandora', 'Cassandra', 'Sybille', 'Ariadne', 'Medea', 'Circe', 'Daphne', 'Phoebe', 'Clio'
	],
	Körperlich: [
		'Hilda', 'Gerda', 'Brunhilde', 'Sigrid', 'Ingrid', 'Frigga', 'Runa', 'Svea', 'Thyra',
		'Valkyrie', 'Kriemhild', 'Gudrid', 'Freydis', 'Lagertha', 'Hervor', 'Brynhild', 'Skuld', 'Hel', 'Ran'
	],
	Künstlerisch: [
		'Lyra', 'Aria', 'Melodie', 'Elara', 'Seraphina', 'Calliope', 'Thalia', 'Muse', 'Harmonie', 'Poesie',
		'Euterpe', 'Terpsichore', 'Erato', 'Polyhymnia', 'Urania', 'Clio', 'Sappho', 'Echo', 'Sirene', 'Nixe'
	],
	Sozial: [
		'Rosa', 'Viola', 'Flora', 'Fauna', 'Felicia', 'Amara', 'Cara', 'Mira', 'Vita', 'Gloria',
		'Irene', 'Concordia', 'Pax', 'Caritas', 'Gratia', 'Laetitia', 'Clementia', 'Fidelia', 'Veritas', 'Spes'
	],
	Trauma: [
		'Asche', 'Nyx', 'Morwen', 'Ravenna', 'Tenebra', 'Umbra', 'Noctis', 'Obscura', 'Vesper', 'Melancholie',
		'Morrigan', 'Hecate', 'Persephone', 'Nemesis', 'Atropos', 'Lilith', 'Moira', 'Keres', 'Eris', 'Lamia'
	]
};

export const maennlicheNamen: Record<string, string[]> = {
	Bodenständig: [
		'Stein', 'Fels', 'Granit', 'Basalt', 'Kiefer', 'Torf', 'Grund', 'Flint', 'Schiefer',
		'Eiche', 'Ahorn', 'Lärche', 'Wacholder', 'Holunder', 'Escher', 'Eller', 'Buchs',
		'Ginster', 'Rosmarin', 'Lorbeer', 'Wermut', 'Beifuß', 'Bärlauch'
	],
	Charakter: [
		'Baldur', 'Freyr', 'Magnus', 'Ragnar', 'Leif', 'Björn', 'Erik', 'Olaf', 'Sven', 'Torben',
		'Gunnar', 'Harald', 'Ivar', 'Njord', 'Sigurd', 'Ulf', 'Vidar', 'Yngvar', 'Asmund', 'Egil'
	],
	Intellektuell: [
		'Aldric', 'Cedric', 'Edmund', 'Oswald', 'Reinhard', 'Siegmund', 'Wolfram', 'Ansgar', 'Gerhard', 'Norbert',
		'Aristoteles', 'Platon', 'Sokrates', 'Seneca', 'Virgil', 'Homer', 'Ovid', 'Cicero', 'Merlin', 'Prospero'
	],
	Körperlich: [
		'Thor', 'Tyr', 'Beowulf', 'Siegfried', 'Roland', 'Gunther', 'Hagen', 'Volker', 'Dietrich', 'Hildebrand',
		'Achilles', 'Hektor', 'Ajax', 'Odysseus', 'Perseus', 'Theseus', 'Herkules', 'Leonidas', 'Spartacus', 'Conan'
	],
	Künstlerisch: [
		'Orpheus', 'Apollo', 'Bardo', 'Lyrik', 'Vers', 'Reim', 'Klang', 'Akkord', 'Takt', 'Duett',
		'Linus', 'Amphion', 'Arion', 'Thamyris', 'Musaeus', 'Demodocus', 'Phemius', 'Pan', 'Marsyas', 'Silenus'
	],
	Sozial: [
		'Felix', 'Benedikt', 'Clemens', 'Konrad', 'Fridolin', 'Gottfried', 'Hartmut', 'Liebwin', 'Traugott', 'Winfried',
		'Amadeus', 'Bonifatius', 'Desiderius', 'Eusebius', 'Fidelis', 'Hilarius', 'Justus', 'Pius', 'Severinus', 'Valentin'
	],
	Trauma: [
		'Grimm', 'Dorn', 'Schatten', 'Nebel', 'Frost', 'Sturm', 'Donner', 'Blitz', 'Zorn', 'Gram',
		'Thanatos', 'Hades', 'Charon', 'Morpheus', 'Hypnos', 'Erebus', 'Tartarus', 'Kronos', 'Typhon', 'Cerberus'
	]
};

// Titel nach Geschlecht und Kategorie
export const weiblicheTitel: Record<string, string[]> = {
	Bodenständig: ['die Beständige', 'die Geduldige', 'die Stille', 'die Weise', 'die Wachsame', 'die Verborgene'],
	Charakter: ['die Heitere', 'die Sanfte', 'die Nachdenkliche', 'die Unerschütterliche', 'die Strahlende', 'die Gelassene'],
	Intellektuell: ['die Gelehrte', 'die Scharfsinnige', 'die Listge', 'die Neugierige', 'die Seherin', 'die Weise'],
	Körperlich: ['die Tapfere', 'die Unbeugsame', 'die Feurige', 'die Starke', 'die Wilde', 'die Kriegerin'],
	Künstlerisch: ['die Träumerin', 'die Dichterin', 'die Schöpferin', 'die Verzaubernde', 'die Wundertätige', 'die Muse'],
	Sozial: ['die Gütige', 'die Herzliche', 'die Beschützerin', 'die Gastfreundliche', 'die Verbindende', 'die Wandlerin'],
	Trauma: ['die Gebrochene', 'die Rastlose', 'die Gefallene', 'die Einsame', 'die Hohle', 'die Zornige', 'die Trauernde', 'die Verlorene']
};

export const maennlicheTitel: Record<string, string[]> = {
	Bodenständig: ['der Beständige', 'der Geduldige', 'der Stille', 'der Weise', 'der Wachsame', 'der Verborgene'],
	Charakter: ['der Heitere', 'der Sanfte', 'der Nachdenkliche', 'der Unerschütterliche', 'der Strahlende', 'der Gelassene'],
	Intellektuell: ['der Gelehrte', 'der Scharfsinnige', 'der Listige', 'der Neugierige', 'der Seher', 'der Weise'],
	Körperlich: ['der Tapfere', 'der Unbeugsame', 'der Feurige', 'der Starke', 'der Wilde', 'der Krieger'],
	Künstlerisch: ['der Träumer', 'der Dichter', 'der Schöpfer', 'der Verzaubernde', 'der Wundertätige', 'der Barde'],
	Sozial: ['der Gütige', 'der Herzliche', 'der Beschützer', 'der Gastfreundliche', 'der Verbindende', 'der Wandler'],
	Trauma: ['der Gebrochene', 'der Rastlose', 'der Gefallene', 'der Einsame', 'der Hohle', 'der Zornige', 'der Trauernde', 'der Verlorene']
};

// Generated Bekannter type
export type Geschlecht = 'weiblich' | 'männlich';

export interface Chimaere {
	oben: string;  // Oberer/vorderer Teil
	unten: string; // Unterer/hinterer Teil
}

export interface GenerierterBekannter {
	name: string;
	tier: string;
	chimaere?: Chimaere; // Optional: wenn gesetzt, ist es eine Chimäre
	berufe: string[]; // Ausgewählte Berufe (1, selten 2)
	merkmal: Merkmal;
	kategorie: string;
	geschlecht: Geschlecht;
	charakterKlasse?: CharakterKlasse; // Optional: für Spielercharaktere
	bild?: string; // Optional: generiertes Bild als Base64 Data URL
}

export interface CharakterKlasse {
	name: string;
	frage: string;
	tokens: {
		anderer: string;
		selbst: string;
		ausgeben: string;
	};
	besonders: string;
	warnung?: string;
}


// Generate a Bekannter with full data
export function generiereBekanntenData(erlaubeMagisch: boolean, erlaubeTrauma: boolean): GenerierterBekannter {
	const kategorien = [...alleKategorien];

	if (erlaubeTrauma) {
		kategorien.push(traumaKategorie);
	}

	// Filter magic traits if needed
	const gefilterteKategorien = kategorien.map(kat => ({
		...kat,
		merkmale: erlaubeMagisch
			? kat.merkmale
			: kat.merkmale.filter(m => !m.magisch)
	})).filter(kat => kat.merkmale.length > 0);

	// Select random category and trait
	const kategorie = getRandomElement(gefilterteKategorien);
	const merkmal = getRandomElement(kategorie.merkmale);

	// Select gender (50/50)
	const geschlecht: Geschlecht = Math.random() < 0.5 ? 'weiblich' : 'männlich';

	// Get name based on gender and category
	const namenListe = geschlecht === 'weiblich'
		? weiblicheNamen[kategorie.name] || weiblicheNamen['Charakter']
		: maennlicheNamen[kategorie.name] || maennlicheNamen['Charakter'];
	let name = getRandomElement(namenListe);

	// 10% chance to add a title
	if (Math.random() < 0.1) {
		const titelListe = geschlecht === 'weiblich'
			? weiblicheTitel[kategorie.name] || weiblicheTitel['Charakter']
			: maennlicheTitel[kategorie.name] || maennlicheTitel['Charakter'];
		const titel = getRandomElement(titelListe);

		// 50% chance title comes before or after
		if (Math.random() < 0.5) {
			name = `${name} ${titel}`;
		} else {
			// Capitalize title when it comes first
			const titelCapitalized = titel.charAt(0).toUpperCase() + titel.slice(1);
			name = `${titelCapitalized} ${name}`;
		}
	}

	// Select tier (5% chance for chimera)
	let tier: string;
	let chimaere: Chimaere | undefined;

	if (Math.random() < 0.05) {
		// Chimäre: zwei verschiedene Tierwesen kombinieren
		const oben = getRandomElement(tierwesen);
		let unten = getRandomElement(tierwesen);
		// Sicherstellen, dass es zwei verschiedene Tiere sind
		while (unten === oben) {
			unten = getRandomElement(tierwesen);
		}
		chimaere = { oben, unten };
		tier = `${oben}-${unten}`;
	} else {
		tier = getRandomElement(tierwesen);
	}

	// Select profession(s): 1 normally, 10% chance for 2
	const berufe: string[] = [];
	const erstBeruf = getRandomElement(merkmal.berufe);
	berufe.push(erstBeruf);

	if (Math.random() < 0.1 && merkmal.berufe.length > 1) {
		// Zweiten Beruf wählen (muss anders sein)
		let zweitBeruf = getRandomElement(merkmal.berufe);
		while (zweitBeruf === erstBeruf) {
			zweitBeruf = getRandomElement(merkmal.berufe);
		}
		berufe.push(zweitBeruf);
	}

	return {
		name,
		tier,
		chimaere,
		berufe,
		merkmal,
		kategorie: kategorie.name,
		geschlecht
	};
}
