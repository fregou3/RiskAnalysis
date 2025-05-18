-- Données d'exemple pour l'application RiskAnalysis

-- Insertion d'une entreprise exemple (Veolia)
INSERT INTO companies (siren, name, legal_form, creation_date, address, postal_code, city, country)
VALUES ('572025526', 'VEOLIA EAU - COMPAGNIE GENERALE DES EAUX', 'Société en commandite par actions', '1957-01-01', '21 RUE LA BOETIE', '75008', 'PARIS', 'France')
ON CONFLICT (siren) DO NOTHING;

-- Insertion de données financières pour Veolia (basées sur les données réelles)
INSERT INTO financial_data (company_id, year, revenue, net_income, gross_margin, ebitda, employees, gross_margin_rate, ebitda_margin, working_capital, cash_flow)
VALUES 
((SELECT id FROM companies WHERE siren = '572025526'), 2023, 2085113123, -50381946, 2396962331, -9534762, NULL, 115, -0.5, -540653874, 231528439),
((SELECT id FROM companies WHERE siren = '572025526'), 2022, 2046189514, 162854684, 2360898736, -14443361, NULL, 115.4, -0.7, -690773138, 168758434),
((SELECT id FROM companies WHERE siren = '572025526'), 2021, 1993149572, 909905640, 2271309297, -29042510, 7204, 114, -1.5, 572299851, 1765812191),
((SELECT id FROM companies WHERE siren = '572025526'), 2020, 2006198013, 151525536, 2225787345, -17999033, 7060, 110.9, -0.9, 4103944620, 120023612),
((SELECT id FROM companies WHERE siren = '572025526'), 2019, 2142054501, -93017881, 2389056917, -2436615, 7170, 111.5, -0.1, 479448332, 182656880)
ON CONFLICT (company_id, year) DO NOTHING;

-- Insertion d'une analyse de risque exemple
INSERT INTO risk_analyses (company_id, user_input, openai_response, anthropic_response, deepseek_response, gemini_response, reasoning)
VALUES (
  (SELECT id FROM companies WHERE siren = '572025526'),
  'Analyse des risques pour Veolia',
  '# Analyse de risque pour Veolia\n\n## Risques financiers\n- Endettement élevé avec un ratio dette/EBITDA de 3.1\n- Marge EBITDA négative sur plusieurs années\n- Besoin en fonds de roulement négatif\n\n## Risques opérationnels\n- Forte dépendance aux contrats publics\n- Exposition aux variations des prix des matières premières\n\n## Risques réglementaires\n- Secteur fortement régulé\n- Évolutions des normes environnementales\n\n## Note de risque: 75 Ø=ßO',
  '# Analyse de Veolia par Claude\n\n## Profil financier\n- Chiffre d''affaires stable autour de 2 milliards €\n- Résultats nets volatils\n- EBITDA négatif sur plusieurs exercices\n\n## Forces\n- Leader dans le secteur de l''eau\n- Présence internationale\n- Expertise reconnue\n\n## Faiblesses\n- Rentabilité opérationnelle faible\n- Structure financière tendue\n\n## Note de risque: 70 Ø=ßO',
  '# Analyse DeepSeek de Veolia\n\n## Indicateurs clés\n- CA: 2,085 milliards € (2023)\n- Résultat net: -50,4 millions € (2023)\n- Marge brute: 115%\n\n## Points d''attention\n- Résultat d''exploitation faible\n- BFR négatif\n- Taux de levier préoccupant\n\n## Recommandations\n- Surveillance de la trésorerie\n- Analyse des contrats majeurs\n\n## Note de risque: 80 Ø=ßR',
  '# Analyse Gemini\n\n## Synthèse financière\n- Activité stable mais rentabilité insuffisante\n- Résultats nets irréguliers\n- Trésorerie sous tension\n\n## Risques identifiés\n- Risque de liquidité à moyen terme\n- Exposition aux marchés publics\n- Pression concurrentielle\n\n## Note de risque: 65 Ø=ßO',
  '# Synthèse des analyses pour Veolia\n\nLes quatre modèles d''IA convergent sur plusieurs points d''attention:\n\n1. **Rentabilité opérationnelle faible** avec un EBITDA négatif sur plusieurs exercices\n2. **Structure financière tendue** avec un BFR négatif et un taux de levier élevé\n3. **Dépendance aux contrats publics** qui représente un risque de concentration\n\nLa note de risque moyenne se situe autour de 72/100, ce qui correspond à un niveau de risque **modéré à élevé**.\n\nRecommandations:\n- Surveiller attentivement la trésorerie\n- Analyser la structure des coûts pour améliorer la rentabilité opérationnelle\n- Diversifier le portefeuille de clients\n\n## Note de risque globale: 72 Ø=ßO'
);

-- Insertion d'un historique de recherche
INSERT INTO search_history (company_id, search_term, search_type)
VALUES 
((SELECT id FROM companies WHERE siren = '572025526'), 'Veolia', 'company_name'),
((SELECT id FROM companies WHERE siren = '572025526'), '572025526', 'siren');
