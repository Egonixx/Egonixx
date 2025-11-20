// src/server.ts
// Fichier principal du serveur Express pour l'application météo

// Import de la configuration des variables d'environnement depuis le fichier .env
// Cela permet de charger automatiquement les variables comme OPENWEATHER_API_KEY et PORT
import "dotenv/config";

// Import du framework Express pour créer le serveur HTTP
import express from "express";

// Import du middleware CORS pour autoriser les requêtes cross-origin depuis le frontend
import cors from "cors";

// Création de l'instance de l'application Express
// Cette instance gère toutes les routes et middlewares
const app = express();

// Configuration du middleware CORS pour autoriser toutes les origines
// Cela permet au frontend (qui tourne sur un port différent) de communiquer avec le backend
app.use(cors());

// Configuration du middleware pour parser automatiquement les corps de requêtes JSON
// Toutes les requêtes avec Content-Type: application/json seront automatiquement converties en objets JavaScript
app.use(express.json());

// Route GET pour vérifier l'état de santé du serveur
// Utile pour les tests et le monitoring de l'application
// Le paramètre _req est préfixé avec _ car il n'est pas utilisé dans cette route
app.get("/api/health", (_req, res) => {
  // Retourne un objet JSON avec le statut "ok" pour indiquer que le serveur fonctionne
  res.json({ status: "ok" });
});

// Route GET pour récupérer les données météorologiques d'une ville
// Cette route fait un appel à l'API OpenWeatherMap et retourne les données formatées
app.get("/api/weather", async (req, res) => {
  try {
    // Extraction du paramètre de requête "city" depuis l'URL
    // Exemple: /api/weather?city=Paris
    // Le "as string" indique à TypeScript que nous attendons une chaîne de caractères
    const city = req.query.city as string;

    // Vérification que le paramètre city est bien présent dans la requête
    // Si absent, on retourne une erreur 400 (Bad Request) avec un message explicite
    if (!city) {
      return res.status(400).json({ error: "Paramètre 'city' manquant." });
    }

    // Récupération de la clé API OpenWeatherMap depuis les variables d'environnement
    // Cette clé est nécessaire pour authentifier les requêtes vers l'API externe
    const apiKey = process.env.OPENWEATHER_API_KEY;
    console.log("API KEY côté serveur :", apiKey); // DEBUG

    // Vérification que la clé API est bien configurée
    // Si absente, on retourne une erreur 500 (Internal Server Error)
    // car c'est un problème de configuration serveur, pas une erreur client
    if (!apiKey) {
      return res.status(500).json({ error: "Clé API manquante côté serveur." });
    }

    // Construction de l'URL pour l'API OpenWeatherMap
    // encodeURIComponent() encode la ville pour gérer les caractères spéciaux (espaces, accents, etc.)
    // &units=metric : demande les températures en Celsius
    // &lang=fr : demande les descriptions en français
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
      city
    )}&appid=${apiKey}&units=metric&lang=fr`;

    console.log("URL appelée :", url); // DEBUG
    console.log("API KEY lue côté serveur :", apiKey);
    console.log("URL appelées :", url);
    
    // Envoi de la requête HTTP GET vers l'API OpenWeatherMap
    // await permet d'attendre la réponse avant de continuer l'exécution
    const response = await fetch(url);

    // Récupération du texte brut de la réponse
    // On utilise text() au lieu de json() pour pouvoir logger la réponse complète en cas d'erreur
    const rawText = await response.text();
    console.log("Réponse brute OpenWeather :", rawText); // DEBUG

    // Vérification du statut HTTP de la réponse
    // response.ok est true si le statut est entre 200 et 299
    if (!response.ok) {
      // Gestion spécifique du cas où la ville n'est pas trouvée (404)
      // On retourne une erreur 404 avec un message clair pour l'utilisateur
      if (response.status === 404) {
        return res.status(404).json({ error: "Ville introuvable." });
      }
      // Pour toutes les autres erreurs HTTP, on retourne une erreur 500 générique
      // Cela peut être une erreur d'authentification, de quota API, etc.
      return res
        .status(500)
        .json({ error: "Erreur lors de l'appel à l'API météo." });
    }

    // Conversion du texte JSON brut en objet JavaScript
    // Cela permet d'accéder facilement aux propriétés de la réponse
    const data = JSON.parse(rawText);

    // Retour de la réponse formatée avec uniquement les données nécessaires
    // On extrait et formate les données pour simplifier l'utilisation côté frontend
    // L'opérateur ?. (optional chaining) et ?? (nullish coalescing) gèrent les cas où les données pourraient être manquantes
    return res.json({
      city: data.name, // Nom de la ville
      temp: data.main.temp, // Température en Celsius
      description: data.weather?.[0]?.description ?? "N/A", // Description météo (ex: "ciel dégagé")
      icon: data.weather?.[0]?.icon ?? "N/A", // Code de l'icône météo pour l'affichage
    });
  } catch (err) {
    // Gestion des erreurs inattendues (erreurs réseau, parsing JSON, etc.)
    // On log l'erreur complète dans la console pour le débogage
    console.error(err);
    // On retourne une erreur 500 générique pour ne pas exposer les détails techniques à l'utilisateur
    return res.status(500).json({ error: "Erreur serveur." });
  }
});


// Définition du port d'écoute du serveur
// On utilise la variable d'environnement PORT si elle existe, sinon on utilise le port 3000 par défaut
// Cela permet de configurer le port facilement selon l'environnement (dev, production, etc.)
const PORT = process.env.PORT || 3000;

// Démarrage du serveur HTTP sur le port spécifié
// Le callback est exécuté une fois que le serveur est prêt à accepter des connexions
app.listen(PORT, () => {
  // Affichage d'un message de confirmation dans la console pour indiquer que le serveur est démarré
  console.log(`Server listening on port ${PORT}`);
});
