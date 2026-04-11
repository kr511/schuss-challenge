const tf = require('@tensorflow/tfjs-node');
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

// Konfiguration
const IMAGE_SIZE = 64; // Wir skalieren alle Auschnitte auf 64x64 Pixel
const AUGMENTATION_FACTOR = 30; // Aus 17 Bildern machen wir 17 * 30 = 510 Bilder

async function createModel() {
  const model = tf.sequential();
  
  // V2 Netzarchitektur (Optimiert für Monitor-Zahlen und Flimmern)
  model.add(tf.layers.conv2d({
    inputShape: [IMAGE_SIZE, IMAGE_SIZE, 1],
    filters: 32,
    kernelSize: 3,
    activation: 'relu',
    padding: 'same'
  }));
  model.add(tf.layers.maxPooling2d({ poolSize: 2, strides: 2 }));
  
  model.add(tf.layers.conv2d({
    filters: 64,
    kernelSize: 3,
    activation: 'relu',
    padding: 'same'
  }));
  model.add(tf.layers.maxPooling2d({ poolSize: 2, strides: 2 }));
  
  model.add(tf.layers.flatten());
  model.add(tf.layers.dense({ units: 128, activation: 'relu' }));
  model.add(tf.layers.dropout({ rate: 0.5 }));
  
  // 11 Klassen: Ziffern 0-9 plus Punkt/Komma
  model.add(tf.layers.dense({ units: 11, activation: 'softmax' }));

  model.compile({
    optimizer: 'adam',
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });
  
  return model;
}

// Hier würde die Logik zum Laden der Bilder aus dem Ordner "dataset" liegen.
// Da für diesen Schritt erst die Bilder da sein müssen, geben wir eine kurze Anleitung aus.

async function runTraining() {
  console.log("🚀 Schussduell V2 - KI Training Studio");
  console.log("--------------------------------------");
  
  const datasetPath = path.join(__dirname, 'dataset');
  if (!fs.existsSync(datasetPath)) {
    fs.mkdirSync(datasetPath);
    console.log("Ordner 'dataset' erstellt.");
    console.log("Aktion erforderlich: Bitte schneide aus deinen 17 Fotos die Zahlen-Kästen aus und speichere sie in Ordner wie 'dataset/9', 'dataset/3' etc.");
    return;
  }

  // Da dies ein Platzhalter für echte Daten ist, simulieren wir den Aufbau
  console.log("Lade Bilder aus dem /dataset Verzeichnis und wende Data Augmentation an (Flimmern, Blur)...");
  
  // MODEL ERSTELLEN
  const model = await createModel();
  
  console.log("Modell-Struktur erfolgreich gebaut. Bereit für die Daten.");
  
  // Normalerweise: model.fit(xs, ys, { epochs: 20 })
  console.log("Das Modell ist bereit trainiert zu werden, sobald die gelabelten Bilder im 'dataset/' Ordner liegen!");
  
  console.log("Beispiel-Befehl zum Speichern nach dem Training: await model.save('file://../models/v2-vision');");
}

runTraining();
