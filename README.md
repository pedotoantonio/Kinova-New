# Kinova NewStile

Un'applicazione mobile completa per la gestione familiare con funzionalità di pianificazione, budget, note e assistente AI intelligente.

## Caratteristiche

- **Gestione Famiglie**: Crea e gestisci gruppi familiari con ruoli e permessi personalizzati
- **Calendario**: Pianifica eventi, compleanni e attività familiari
- **Budget**: Traccia le spese e gestisci il budget familiare
- **Liste**: Crea liste della spesa e attività
- **Note**: Prendi note con sincronizzazione in tempo reale
- **Assistente AI**: Assistente intelligente per aiutare con la gestione familiare
- **Profili**: Gestisci i profili dei membri della famiglia con avatar personalizzati

## Stack Tecnologico

- **Frontend**: React Native con Expo
- **Backend**: Node.js/Express
- **Database**: PostgreSQL con Drizzle ORM
- **Autenticazione**: JWT + Email-based login
- **AI**: Integrazione con API OpenAI
- **Pagamenti**: Stripe per transazioni

## Installazione

### Prerequisiti

- Node.js (v18 o superiore)
- npm o yarn
- Expo CLI (`npm install -g expo-cli`)
- Git

### Clone del Repository

```bash
git clone https://github.com/pedotoantonio/Kinova-New.git
cd Kinova-New
```

### Installazione delle Dipendenze

```bash
npm install
# o
yarn install
```

### Variabili d'Ambiente

Crea un file `.env` nella root del progetto con le seguenti variabili:

```env
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_jwt_secret_key
OPENAI_API_KEY=your_openai_api_key
STRIPE_KEY=your_stripe_secret_key
NODE_ENV=development
```

### Setup Database

```bash
npm run migrate
npm run seed  # Opzionale: per dati di test
```

### Avviare l'Applicazione

#### Modalità Sviluppo

```bash
npm start
# Segui le istruzioni per aprire l'app in Expo Go
```

#### Build per Produzione

```bash
# iOS
eas build --platform ios

# Android
eas build --platform android
```

## Uso

### Registrazione

1. Apri l'app
2. Inserisci email e password
3. Verifica l'email tramite il link di conferma
4. Accedi al tuo account

### Creare una Famiglia

1. Vai a "Profilo"
2. Clicca "Crea Famiglia"
3. Invita i membri tramite QR code o email

### Aggiungere Eventi

1. Vai a "Calendario"
2. Clicca "+" per aggiungere un evento
3. Compila i dettagli e salva

## API Documentation

La documentazione completa dell'API è disponibile in `/docs/api.md`

## Contribuire

Le contribuzioni sono benvenute! Per favore:

1. Fai il fork del repository
2. Crea un branch per la tua feature (`git checkout -b feature/AmazingFeature`)
3. Commit i tuoi cambiamenti (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Apri una Pull Request

## Licenza

Questo progetto è sotto licenza MIT - vedi il file [LICENSE](LICENSE) per i dettagli.

## Contatti

Per domande o suggerimenti, contatta Antonio Pedoto su [GitHub](https://github.com/pedotoantonio)

## Ringraziamenti

- Team di Expo per l'eccellente framework React Native
- OpenAI per le API di AI
- Tutti i collaboratori che hanno contribuito al progetto
