# Kinova - Checklist QA Pre-Pubblicazione per Expo

Questo documento contiene una lista completa di verifiche da eseguire prima della pubblicazione dell'app Kinova su Expo. Ogni sezione deve essere testata su dispositivo fisico iOS, Android e versione web.

---

## 1. GESTIONE TASTIERA (Keyboard Handling)

### 1.1 Assistente AI (AssistantScreen)
- [ ] La barra di input si sposta correttamente sopra la tastiera quando appare
- [ ] Il contenuto della chat rimane visibile e scrollabile con tastiera aperta
- [ ] Il pulsante di invio e il pulsante allegati sono accessibili con tastiera aperta
- [ ] Chiudendo la tastiera, la barra torna nella posizione originale
- [ ] Su iOS, il comportamento "padding" funziona correttamente
- [ ] Su Android, il comportamento "height" funziona correttamente

### 1.2 Pagina Liste (ListsScreen)
- [ ] Il campo di input per aggiungere articoli rimane visibile con tastiera aperta
- [ ] Le modal di modifica (shopping/task) gestiscono correttamente la tastiera
- [ ] I campi di testo nelle modal sono accessibili e editabili

### 1.3 Pagina Budget (BudgetScreen)
- [ ] I campi nella modal di modifica spese sono accessibili con tastiera aperta
- [ ] Lo scroll funziona correttamente all'interno delle modal

### 1.4 Pagina Note (NotesScreen/NoteDetailScreen)
- [ ] Il campo titolo e contenuto sono accessibili con tastiera
- [ ] KeyboardAwareScrollView funziona correttamente

### 1.5 Altre schermate con input
- [ ] Login: campi username/password accessibili
- [ ] Registrazione: tutti i campi compilabili
- [ ] Profilo: campi di modifica accessibili
- [ ] Calendario: modal creazione evento funziona con tastiera

---

## 2. GESTIONE ALLEGATI E DOCUMENTI

### 2.1 Selezione File (expo-document-picker)
- [ ] Il picker si apre correttamente su iOS
- [ ] Il picker si apre correttamente su Android
- [ ] I file PDF vengono selezionati e caricati
- [ ] I file di testo (.txt, .csv) vengono gestiti
- [ ] Messaggio appropriato mostrato su web (feature non disponibile)

### 2.2 Selezione Immagini (expo-image-picker)
- [ ] Galleria si apre correttamente
- [ ] Fotocamera si apre correttamente (se permessi concessi)
- [ ] Immagini selezionate vengono caricate all'assistente
- [ ] Anteprima immagine mostrata nella chat

### 2.3 Analisi Documenti AI
- [ ] PDF vengono letti e il testo estratto
- [ ] Immagini (scontrini, fatture) vengono analizzate con vision
- [ ] L'assistente propone azioni appropriate dopo l'analisi
- [ ] Indicatore di caricamento mostrato durante l'upload
- [ ] Errori gestiti con messaggi appropriati

### 2.4 Streaming Risposte
- [ ] Le risposte dell'assistente appaiono in streaming
- [ ] Il testo si aggiorna fluidamente durante la generazione
- [ ] Lo scroll automatico segue il nuovo contenuto

---

## 3. LAYOUT E POSIZIONAMENTO

### 3.1 Safe Area Insets
- [ ] Contenuto non va sotto la status bar (notch/dynamic island)
- [ ] Contenuto non va sotto la home indicator (iOS)
- [ ] Padding corretto su tutti i lati dello schermo

### 3.2 Header Navigation
- [ ] Header trasparente: contenuto inizia sotto l'header con padding corretto
- [ ] Header opaco: contenuto inizia immediatamente sotto
- [ ] Pulsanti header (back, menu) sono cliccabili
- [ ] Titoli header sono visibili e centrati

### 3.3 Tab Bar
- [ ] Tab bar visibile su tutte le schermate principali
- [ ] Contenuto non va sotto la tab bar
- [ ] Icone e label dei tab sono visibili
- [ ] Tab attivo evidenziato correttamente
- [ ] Blur effect funziona su iOS

### 3.4 FAB (Floating Action Button)
- [ ] FAB posizionato sopra la tab bar
- [ ] FAB non copre contenuto importante
- [ ] FAB cliccabile e funzionante

### 3.5 Scroll e Liste
- [ ] FlatList scorrono fluidamente
- [ ] Pull-to-refresh funziona
- [ ] Empty state centrato correttamente
- [ ] Indicatori di scroll rispettano safe area

---

## 4. INTERAZIONI GESTURE

### 4.1 Swipe-to-Delete
- [ ] ListsScreen (Shopping): swipe sinistro mostra delete, rilascio elimina
- [ ] ListsScreen (Tasks): swipe sinistro funziona
- [ ] BudgetScreen (Expenses): swipe sinistro funziona
- [ ] CalendarScreen (Events): swipe sinistro funziona
- [ ] NotesScreen: swipe sinistro funziona
- [ ] Haptic feedback su swipe (iOS)
- [ ] Animazione fluida durante lo swipe
- [ ] Card ritorna a posizione originale se swipe incompleto

### 4.2 Tap-to-View/Edit
- [ ] Tap su shopping item apre modal dettagli
- [ ] Tap su task apre modal dettagli
- [ ] Tap su expense apre modal dettagli
- [ ] Tap su event apre modal/screen modifica
- [ ] Tap su nota apre schermata dettaglio
- [ ] Nessun conflitto tra tap e swipe

### 4.3 Modal Interactions
- [ ] Tap fuori dalla modal chiude la modal
- [ ] Pulsante X chiude la modal
- [ ] Gesture di back (Android) chiude la modal
- [ ] Swipe down (se implementato) chiude la modal

---

## 5. PERMESSI

### 5.1 Fotocamera (expo-camera)
- [ ] Prima richiesta mostra dialog sistema
- [ ] Permesso concesso: fotocamera funziona
- [ ] Permesso negato: messaggio appropriato mostrato
- [ ] Pulsante "Apri Impostazioni" funziona (solo mobile)
- [ ] Su web: messaggio "Usa Expo Go per questa funzione"

### 5.2 Galleria Foto (expo-media-library)
- [ ] Prima richiesta mostra dialog sistema
- [ ] Permesso concesso: galleria accessibile
- [ ] Permesso negato: alternativa o messaggio mostrato

### 5.3 Notifiche (expo-notifications)
- [ ] Toggle notifiche inizia OFF
- [ ] Attivando toggle, appare richiesta permesso
- [ ] Permesso concesso: notifiche funzionano
- [ ] Permesso negato: toggle torna a OFF

### 5.4 Posizione (expo-location) - se utilizzata
- [ ] Richiesta permesso foreground
- [ ] Posizione ottenuta con accuratezza appropriata

---

## 6. NAVIGAZIONE

### 6.1 Tab Navigation
- [ ] Tap su Home naviga a Home
- [ ] Tap su Calendario naviga a Calendario
- [ ] Tap su Liste naviga a Liste
- [ ] Tap su Profilo naviga a Profilo
- [ ] Tab nascosti correttamente in base ai permessi utente

### 6.2 Stack Navigation
- [ ] Back button funziona su tutte le schermate
- [ ] Gesture swipe-back funziona (iOS)
- [ ] Deep linking funziona (se implementato)
- [ ] Navigazione tra schermate smooth

### 6.3 Modal Navigation
- [ ] Modal si apre con animazione corretta
- [ ] Modal si chiude correttamente
- [ ] Stato preservato quando modal chiusa

### 6.4 Auth Flow
- [ ] Utente non autenticato vede Login
- [ ] Login riuscito naviga a Home
- [ ] Logout riporta a Login
- [ ] Token persistito dopo riavvio app

---

## 7. DIFFERENZE PIATTAFORMA

### 7.1 iOS Specifico
- [ ] Blur effect su tab bar funziona
- [ ] Haptic feedback funziona
- [ ] Safe area per Dynamic Island
- [ ] Gesture back edge funziona
- [ ] Font SF Pro renderizza correttamente

### 7.2 Android Specifico
- [ ] Status bar colore corretto
- [ ] Navigation bar (bottom) gestita
- [ ] Back button hardware funziona
- [ ] Keyboard mode corretto (adjustResize)
- [ ] Ripple effect su pressable

### 7.3 Web Specifico
- [ ] Fallback per feature native non disponibili
- [ ] Layout responsive
- [ ] Scroll con mouse/trackpad funziona
- [ ] Hover states dove appropriato
- [ ] Linking.openSettings() wrapped in try-catch

---

## 8. DATA FETCHING E API

### 8.1 Query e Mutation
- [ ] Dati caricati correttamente all'avvio
- [ ] Loading indicator durante fetch
- [ ] Dati aggiornati dopo mutation
- [ ] Cache invalidation funziona
- [ ] Pull-to-refresh ricarica dati

### 8.2 Error Handling
- [ ] Errori di rete mostrano messaggio appropriato
- [ ] Retry automatico funziona
- [ ] Errori 401 reindirizzano a login
- [ ] Errori 403 mostrano messaggio permessi
- [ ] Errori 500 gestiti gracefully

### 8.3 Offline Behavior
- [ ] App non crasha senza connessione
- [ ] Messaggio appropriato per offline
- [ ] Dati cached mostrati se disponibili

---

## 9. ANIMAZIONI

### 9.1 React Native Reanimated
- [ ] FadeInDown funziona su nuovi elementi
- [ ] FadeOutUp funziona su elementi rimossi
- [ ] Animazioni smooth a 60fps
- [ ] Nessun warning in console

### 9.2 Gesture Handler
- [ ] GestureDetector risponde correttamente
- [ ] Gesture.Race non causa conflitti
- [ ] scheduleOnRN callback funziona

### 9.3 Transition Animations
- [ ] Navigazione tra schermate animata
- [ ] Modal appaiono con fade
- [ ] Tab switch smooth

---

## 10. MODAL E OVERLAY

### 10.1 Modal Standard
- [ ] Overlay scuro visibile (rgba 0,0,0,0.6)
- [ ] Contenuto centrato
- [ ] Larghezza corretta (screenWidth - padding)
- [ ] Scroll interno funziona se contenuto lungo

### 10.2 Keyboard in Modal
- [ ] KeyboardAvoidingView funziona dentro modal
- [ ] Input fields rimangono visibili
- [ ] Modal si adatta all'altezza disponibile

### 10.3 Dismissal
- [ ] Tap su overlay chiude modal
- [ ] Pulsante close funziona
- [ ] Hardware back (Android) chiude modal
- [ ] onRequestClose implementato

---

## 11. FUNZIONALITA' SPECIFICHE KINOVA

### 11.1 Assistente AI
- [ ] Chat carica storico messaggi
- [ ] Nuovo messaggio inviato correttamente
- [ ] Streaming risposta funziona
- [ ] Azioni proposte mostrate con formato corretto
- [ ] Pulsanti Conferma/Annulla azioni funzionano
- [ ] Upload allegati funziona
- [ ] Interpretazione automatica documenti funziona

### 11.2 Calendario
- [ ] Vista mensile corretta
- [ ] Tap su giorno mostra eventi
- [ ] Creazione evento funziona
- [ ] Modifica evento funziona
- [ ] Eliminazione evento funziona
- [ ] Colori eventi visibili

### 11.3 Liste (Shopping/Tasks)
- [ ] Switch tra Shopping e Tasks funziona
- [ ] Filtri funzionano
- [ ] Aggiunta item funziona
- [ ] Toggle completato funziona
- [ ] Modifica item funziona
- [ ] Eliminazione item funziona

### 11.4 Budget
- [ ] Totale mensile corretto
- [ ] Lista spese visibile
- [ ] Aggiunta spesa funziona
- [ ] Modifica spesa funziona
- [ ] Eliminazione spesa funziona
- [ ] Categorie mostrate correttamente

### 11.5 Note
- [ ] Lista note visibile
- [ ] Filtri (pinned, related) funzionano
- [ ] Creazione nota funziona
- [ ] Modifica nota funziona
- [ ] Colori nota visibili
- [ ] Pin/Unpin funziona
- [ ] Eliminazione nota funziona

### 11.6 Profilo e Famiglia
- [ ] Info utente corrette
- [ ] Lista membri famiglia visibile
- [ ] Invito nuovi membri funziona
- [ ] QR code generato correttamente
- [ ] Gestione permessi (admin) funziona

---

## 12. PERFORMANCE

### 12.1 Caricamento
- [ ] Splash screen visibile durante caricamento
- [ ] App carica in < 3 secondi
- [ ] Font caricati prima del render

### 12.2 Scroll Performance
- [ ] Liste lunghe scrollano smooth
- [ ] Nessun jank durante scroll rapido
- [ ] Virtualizzazione FlatList funziona

### 12.3 Memoria
- [ ] App non crasha dopo uso prolungato
- [ ] Immagini gestite con cache appropriata

---

## Note per il Tester

1. **Dispositivi consigliati per test:**
   - iOS: iPhone con notch + iPhone senza notch
   - Android: Dispositivo recente + dispositivo più datato
   - Web: Chrome, Safari, Firefox

2. **Per ogni test fallito, documentare:**
   - Dispositivo/Piattaforma
   - Passi per riprodurre
   - Comportamento atteso vs comportamento attuale
   - Screenshot/Video se possibile

3. **Test con Expo Go:**
   - Scansionare QR code dalla barra URL Replit
   - Testare su dispositivo fisico per permessi e gesture

4. **Priorità fix:**
   - CRITICO: Crash, perdita dati, funzionalità core rotta
   - ALTO: UX degradata, feature non funzionante
   - MEDIO: Bug visuale, comportamento inatteso
   - BASSO: Miglioramenti estetici, edge case

---

## Checklist Finale Pre-Pubblicazione

- [ ] Tutti i test CRITICO passano
- [ ] Tutti i test ALTO passano
- [ ] Review sicurezza completata
- [ ] API keys/secrets non esposti nel codice
- [ ] Build production testata
- [ ] App.json configurato correttamente
- [ ] Icona e splash screen corretti
