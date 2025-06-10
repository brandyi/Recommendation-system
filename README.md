# Recommendation-system
Aplikácia je do termínu obhajob dostupná taktiež sem: https://bakalarka2-0.vercel.app 

## Požiadavky
Pred inštaláciou je potrebné mať nainštalované:
- **Node.js** (odporúčaná verzia: 16 alebo vyššia)
- **Git** (odporúčaná verzia: 2.30 alebo vyššia)
- **Git LFS** (Large File Storage) na správu veľkých súborov:
  - Nainštalujte Git LFS podľa oficiálnych inštrukcií: https://git-lfs.github.com/
- **PostgreSQL databáza**
  - Nainštalujte PostgreSQL a vytvorte databázu pre aplikáciu pomocou súboru `recommendation_system.sql`.
- **TMDB API kľúč** (voliteľné, ale odporúčané):
  - Zaregistrujte sa na stránke https://www.themoviedb.org/ a získajte API kľúč. 

## Inštalácia

1. **Klonovanie repozitára**  
   Najprv si naklonujte repozitár do vášho počítača:
   ```bash
   git clone <URL-repozitára>
   cd Recommendation-system
   git lfs install
   git lfs pull
   ```

2. **Frontend**  
   Prejdite do priečinka `frontend` a nainštalujte závislosti:
   ```bash
   cd frontend
   npm install
   ```

   Vytvorte súbor `.env` v priečinku `frontend` a nastavte potrebné premenné prostredia:
   ```plaintext
   VITE_TMDB_API_TOKEN=<váš_tmdb_token>
   VITE_BACKEND_URL=http://localhost:8080/ -default
   ```


3. **Backend**  
   Prejdite do priečinka `backend` a nainštalujte závislosti:
   ```bash
   cd ../backend
   npm install
   ```

4. **Konfigurácia**  
   Vytvorte súbor `.env` v priečinku `backend` a nastavte potrebné premenné prostredia podľa vašich preferencií:
   ```plaintext
   DB_USER=<vaše_meno_používateľa> 
   DB_PASSWORD=<vaše_heslo> 
   DB_HOST=<adresa_hostiteľa> 
   DB_PORT=<port_databázy> 
   DB_NAME=<názov_databázy> 

   ACCESS_TOKEN_SECRET=ebe6955042b378414a720ecfe54540587dd3a77a290b4d856de3f03f3362ca51aa0628f4ed98396a80ddcb165900d56116e1f5d0419f8e2cd42281020acbfdd7 -default
   REFRESH_TOKEN_SECRET=1de85817f5f8e44a7d358e0d4eec52f5ef52a3f5aa4ba597a1cd6b7d62f996a34afdff24b4b5ee1fba295dc61eb32a0990389587337a927d7f5634a022a1f91d -default
   TMDB_API_TOKEN=<váš_tmdb_token>

   PORT=8080 -default
   ```

5. **Spustenie aplikácie**  
   Spustite backend:
   ```bash
   nodemon server.js
   ```
   Prejdite do priečinka `frontend` a spustite frontend:
   ```bash
   cd ../frontend
   npm run dev
   ```

6. **Prístup k aplikácii**  
   Po spustení frontend servera (`npm run dev`) otvorte adresu, ktorú vám poskytne terminál, napríklad `http://localhost:3000`.

   > **Poznámka:** Ak aplikácia nefunguje správne, môže byť problém v tom, že adresa frontend servera nie je uvedená vo `whitelist` v súbore `allowedOrigins.js` na backende. Skontrolujte tento súbor a pridajte adresu frontend servera do zoznamu povolených adries.



