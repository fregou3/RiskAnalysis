/**
 * Base de données des SIRENs des grandes entreprises françaises connues
 * Permet d'améliorer la recherche d'entreprises en associant directement les noms courants aux SIRENs corrects
 */

const knownCompanies = {
  // CAC 40 et grandes entreprises françaises
  "air france": "552043002",
  "air france-klm": "552043002",
  "airbus": "383474814",
  "alstom": "389058447",
  "arcelormittal": "562094806",
  "axa": "572093920",
  "bnp": "662042449",
  "bnp paribas": "662042449",
  "bouygues": "572015246",
  "capgemini": "330703844",
  "carrefour": "652014051",
  "credit agricole": "784608416",
  "danone": "552032534",
  "edf": "552081317",
  "electricite de france": "552081317",
  "engie": "542107651",
  "essilor": "712049618",
  "hermes": "572076396",
  "kering": "552075020",
  "l'oreal": "632012100",
  "loreal": "632012100",
  "lvmh": "775670417",
  "michelin": "855200507",
  "orange": "380129866",
  "peugeot": "552100554",
  "psa": "552100554",
  "renault": "441639465",
  "safran": "562082909",
  "saint-gobain": "542039532",
  "sanofi": "395030844",
  "schneider electric": "542048574",
  "societe generale": "552120222",
  "stmicroelectronics": "341459386",
  "teleperformance": "301292702",
  "thales": "552059024",
  "total": "542051180",
  "totalenergies": "542051180",
  "veolia": "403210032",
  "vinci": "552037806",
  "vivendi": "343134763",
  
  // Autres grandes entreprises françaises
  "accor": "602036444",
  "atos": "323623603",
  "bic": "552008443",
  "societe bic": "552008443",
  "clarins": "330589658",
  "groupe clarins": "514620707",
  "dassault": "712042456",
  "dassault systemes": "322306440",
  "decathlon": "306138900",
  "fnac darty": "055800296",
  "galeries lafayette": "572062594",
  "lactalis": "331142554",
  "legrand": "421259615",
  "nestle france": "542014428",
  "oreal": "632012100",
  "pernod ricard": "582041943",
  "seb": "300349636",
  "sodexo": "301940219",
  "suez": "433466583",
  "valeo": "552030967",
  
  // Banques et assurances
  "credit mutuel": "588505354",
  "banque populaire": "552028839",
  "caisse d'epargne": "383680220",
  "hsbc france": "775670284",
  "la banque postale": "421100645",
  "groupama": "343115135",
  "maif": "775709702",
  "matmut": "775701675",
  
  // Distribution
  "auchan": "476180625",
  "casino": "554501171",
  "leclerc": "343262622",
  "intermarche": "777323065",
  "monoprix": "552018020",
  "franprix": "955200281",
  "lidl france": "343262622",
  
  // Technologie
  "dassault systemes": "322306440",
  "ubisoft": "335186094",
  "criteo": "484786249",
  "doctolib": "794411850",
  "blablacar": "491904546",
  
  // Luxe et mode
  "chanel": "542052766",
  "dior": "582110987",
  "lacoste": "584041954",
  "yves saint laurent": "342547955",
  
  // Énergie et services
  "enedis": "444608442",
  "grdf": "444786511",
  "edf renouvelables": "379677636",
  "suez environnement": "433466583",
  
  // Transport
  "sncf": "552049447",
  "ratp": "775663438",
  "air france": "552043002",
  "aeroports de paris": "552016628",
  "cdg": "552016628",
  
  // Agroalimentaire
  "danone": "552032534",
  "bonduelle": "447250885",
  "fleury michon": "572058329",
  "bel": "542088067",
  "bongrain": "847120646",
  "savencia": "847120646"
};

module.exports = knownCompanies;
