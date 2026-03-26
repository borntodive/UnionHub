#!/bin/bash

# Script per generare icone iOS e Android da logo sorgente
# Richiede: ImageMagick (convert)

set -e

SOURCE="logo-source.png"
ASSETS_DIR="$(dirname "$0")"
cd "$ASSETS_DIR"

# Verifica che il file sorgente esista
if [ ! -f "$SOURCE" ]; then
    echo "Errore: $SOURCE non trovato in $ASSETS_DIR"
    echo "Salva il logo generato da Kimi come 'logo-source.png' in questa cartella"
    exit 1
fi

echo "Generazione icone da $SOURCE..."

# Colori
CISL_GREEN="#177246"

# 1. iOS Icon (1024x1024) - quadrato con bordi arrotondati (iOS li applica automaticamente)
echo "Creazione icon.png (iOS)..."
convert "$SOURCE" -resize 1024x1024 -background transparent -gravity center -extent 1024x1024 icon.png

# 2. Android Adaptive Icon - Foreground (solo il logo, più piccolo per lasciare spazio al crop)
echo "Creazione adaptive-icon.png (Android foreground)..."
convert "$SOURCE" -resize 800x800 -background transparent -gravity center -extent 1024x1024 adaptive-icon.png

# 3. Android Adaptive Icon - Background (colore CISL green)
echo "Creazione adaptive-icon-background.png (Android background)..."
convert -size 1024x1024 xc:"$CISL_GREEN" adaptive-icon-background.png

# 4. Splash screen (sfondo verde con logo centrato, dimensioni iPhone 14 Pro Max)
echo "Creazione splash.png..."
convert -size 1284x2778 xc:"$CISL_GREEN" \
    \( "$SOURCE" -resize 600x600 -background transparent \) \
    -gravity center -composite splash.png

# 5. Favicon (64x64)
echo "Creazione favicon.png..."
convert "$SOURCE" -resize 64x64 favicon.png

echo ""
echo "✅ Icone generate con successo!"
echo ""
echo "File creati:"
ls -lh icon.png adaptive-icon.png adaptive-icon-background.png splash.png favicon.png
echo ""
echo "Ora puoi fare il commit e push delle icone."
