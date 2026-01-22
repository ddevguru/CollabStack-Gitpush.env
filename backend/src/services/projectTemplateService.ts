import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ProjectFile {
  path: string;
  content: string;
  isDirectory: boolean;
}

export class ProjectTemplateService {
  /**
   * Detect project type from description or name
   */
  detectProjectType(description?: string, name?: string): string {
    const text = `${description || ''} ${name || ''}`.toLowerCase();

    if (text.includes('react') || text.includes('next.js') || text.includes('nextjs')) {
      return 'react';
    }
    if (text.includes('vue')) {
      return 'vue';
    }
    if (text.includes('angular')) {
      return 'angular';
    }
    if (text.includes('flutter') || text.includes('dart')) {
      return 'flutter';
    }
    if (text.includes('android') || text.includes('kotlin') || text.includes('java android')) {
      return 'android';
    }
    if (text.includes('ios') || text.includes('swift') || text.includes('objective-c')) {
      return 'ios';
    }
    if (text.includes('node') || text.includes('express') || text.includes('backend')) {
      return 'nodejs';
    }
    if (text.includes('python') && (text.includes('django') || text.includes('flask'))) {
      return 'python-web';
    }
    if (text.includes('spring') || text.includes('java web')) {
      return 'java-web';
    }
    if (text.includes('html') || text.includes('css') || text.includes('vanilla')) {
      return 'html-css';
    }
    if (text.includes('go') || text.includes('golang')) {
      return 'go';
    }
    if (text.includes('rust')) {
      return 'rust';
    }
    if (text.includes('php')) {
      return 'php';
    }
    if (text.includes('ruby') || text.includes('rails')) {
      return 'ruby';
    }
    if (text.includes('c#') || text.includes('csharp') || text.includes('.net')) {
      return 'csharp';
    }
    if (text.includes('cpp') || text.includes('c++')) {
      return 'cpp';
    }
    if (text.includes('c ') && !text.includes('c++') && !text.includes('c#')) {
      return 'c';
    }

    return 'generic';
  }

  /**
   * Generate folder structure based on project type
   */
  async generateProjectStructure(
    projectId: string,
    projectType: string,
    projectName: string
  ): Promise<void> {
    const structure = this.getTemplateStructure(projectType, projectName);
    
    // Create all files and directories
    for (const file of structure) {
      await prisma.file.create({
        data: {
          projectId,
          path: file.path,
          content: file.content,
          isDirectory: file.isDirectory,
        },
      });
    }
  }

  /**
   * Get template structure for different project types
   */
  private getTemplateStructure(projectType: string, projectName: string): ProjectFile[] {
    const sanitizedName = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    switch (projectType) {
      case 'react':
        return [
          { path: 'package.json', content: this.getReactPackageJson(sanitizedName), isDirectory: false },
          { path: 'src', content: '', isDirectory: true },
          { path: 'src/index.js', content: this.getReactIndex(), isDirectory: false },
          { path: 'src/App.js', content: this.getReactApp(), isDirectory: false },
          { path: 'src/App.css', content: this.getReactCSS(), isDirectory: false },
          { path: 'public', content: '', isDirectory: true },
          { path: 'public/index.html', content: this.getReactHTML(sanitizedName), isDirectory: false },
          { path: 'README.md', content: this.getReactREADME(sanitizedName), isDirectory: false },
          { path: '.gitignore', content: this.getGitignore('node'), isDirectory: false },
        ];

      case 'flutter':
        return [
          { path: 'pubspec.yaml', content: this.getFlutterPubspec(sanitizedName), isDirectory: false },
          { path: 'lib', content: '', isDirectory: true },
          { path: 'lib/main.dart', content: this.getFlutterMain(), isDirectory: false },
          { path: 'README.md', content: this.getFlutterREADME(sanitizedName), isDirectory: false },
          { path: '.gitignore', content: this.getGitignore('flutter'), isDirectory: false },
        ];

      case 'nodejs':
        return [
          { path: 'package.json', content: this.getNodePackageJson(sanitizedName), isDirectory: false },
          { path: 'src', content: '', isDirectory: true },
          { path: 'src/index.js', content: this.getNodeIndex(), isDirectory: false },
          { path: 'src/server.js', content: this.getNodeServer(), isDirectory: false },
          { path: 'README.md', content: this.getNodeREADME(sanitizedName), isDirectory: false },
          { path: '.gitignore', content: this.getGitignore('node'), isDirectory: false },
        ];

      case 'python-web':
        return [
          { path: 'requirements.txt', content: this.getPythonRequirements(), isDirectory: false },
          { path: 'app.py', content: this.getPythonApp(), isDirectory: false },
          { path: 'README.md', content: this.getPythonREADME(sanitizedName), isDirectory: false },
          { path: '.gitignore', content: this.getGitignore('python'), isDirectory: false },
        ];

      case 'android':
        return [
          { path: 'app', content: '', isDirectory: true },
          { path: 'app/src', content: '', isDirectory: true },
          { path: 'app/src/main', content: '', isDirectory: true },
          { path: 'app/src/main/java', content: '', isDirectory: true },
          { path: 'app/src/main/java/com/example/MainActivity.java', content: this.getAndroidMain(), isDirectory: false },
          { path: 'app/src/main/AndroidManifest.xml', content: this.getAndroidManifest(), isDirectory: false },
          { path: 'build.gradle', content: this.getAndroidGradle(), isDirectory: false },
          { path: 'README.md', content: this.getAndroidREADME(sanitizedName), isDirectory: false },
          { path: '.gitignore', content: this.getGitignore('android'), isDirectory: false },
        ];

      case 'ios':
        return [
          { path: 'App.swift', content: this.getIOSApp(), isDirectory: false },
          { path: 'ContentView.swift', content: this.getIOSContentView(), isDirectory: false },
          { path: 'Info.plist', content: this.getIOSInfoPlist(), isDirectory: false },
          { path: 'README.md', content: this.getIOSREADME(sanitizedName), isDirectory: false },
          { path: '.gitignore', content: this.getGitignore('ios'), isDirectory: false },
        ];

      case 'vue':
        return [
          { path: 'package.json', content: this.getVuePackageJson(sanitizedName), isDirectory: false },
          { path: 'src', content: '', isDirectory: true },
          { path: 'src/main.js', content: this.getVueMain(), isDirectory: false },
          { path: 'src/App.vue', content: this.getVueApp(), isDirectory: false },
          { path: 'public/index.html', content: this.getVueHTML(sanitizedName), isDirectory: false },
          { path: 'README.md', content: this.getVueREADME(sanitizedName), isDirectory: false },
          { path: '.gitignore', content: this.getGitignore('node'), isDirectory: false },
        ];

      case 'html-css':
        return [
          { path: 'index.html', content: this.getHTMLIndex(sanitizedName), isDirectory: false },
          { path: 'styles.css', content: this.getHTMLCSS(), isDirectory: false },
          { path: 'script.js', content: this.getHTMLJS(), isDirectory: false },
          { path: 'README.md', content: this.getHTMLREADME(sanitizedName), isDirectory: false },
        ];

      case 'go':
        return [
          { path: 'go.mod', content: this.getGoMod(sanitizedName), isDirectory: false },
          { path: 'main.go', content: this.getGoMain(), isDirectory: false },
          { path: 'README.md', content: this.getGoREADME(sanitizedName), isDirectory: false },
          { path: '.gitignore', content: this.getGitignore('go'), isDirectory: false },
        ];

      case 'rust':
        return [
          { path: 'Cargo.toml', content: this.getRustCargo(sanitizedName), isDirectory: false },
          { path: 'src', content: '', isDirectory: true },
          { path: 'src/main.rs', content: this.getRustMain(), isDirectory: false },
          { path: 'README.md', content: this.getRustREADME(sanitizedName), isDirectory: false },
          { path: '.gitignore', content: this.getGitignore('rust'), isDirectory: false },
        ];

      case 'java-web':
        return [
          { path: 'pom.xml', content: this.getJavaPOM(sanitizedName), isDirectory: false },
          { path: 'src/main/java', content: '', isDirectory: true },
          { path: 'src/main/java/com/example/Application.java', content: this.getJavaApp(), isDirectory: false },
          { path: 'src/main/resources/application.properties', content: this.getJavaProperties(), isDirectory: false },
          { path: 'README.md', content: this.getJavaREADME(sanitizedName), isDirectory: false },
          { path: '.gitignore', content: this.getGitignore('java'), isDirectory: false },
        ];

      default:
        return [
          { path: 'README.md', content: `# ${projectName}\n\nProject description goes here.`, isDirectory: false },
          { path: 'main.js', content: 'console.log("Hello, World!");\n', isDirectory: false },
        ];
    }
  }

  // Template content generators
  private getReactPackageJson(name: string): string {
    return JSON.stringify({
      name,
      version: '0.1.0',
      private: true,
      dependencies: {
        react: '^18.2.0',
        'react-dom': '^18.2.0',
        'react-scripts': '5.0.1',
      },
      scripts: {
        start: 'react-scripts start',
        build: 'react-scripts build',
        test: 'react-scripts test',
        eject: 'react-scripts eject',
      },
    }, null, 2);
  }

  private getReactIndex(): string {
    return `import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);\n`;
  }

  private getReactApp(): string {
    return `import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Welcome to React</h1>
        <p>Start editing to see some magic happen!</p>
      </header>
    </div>
  );
}

export default App;\n`;
  }

  private getReactCSS(): string {
    return `.App {
  text-align: center;
}

.App-header {
  background-color: #282c34;
  padding: 20px;
  color: white;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: calc(10px + 2vmin);
}\n`;
  }

  private getReactHTML(name: string): string {
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${name}</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>\n`;
  }

  private getFlutterPubspec(name: string): string {
    return `name: ${name}
description: A new Flutter project.
version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter

dev_dependencies:
  flutter_test:
    sdk: flutter

flutter:
  uses-material-design: true\n`;
  }

  private getFlutterMain(): string {
    return `import 'package:flutter/material.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter Demo',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: const MyHomePage(title: 'Flutter Demo Home Page'),
    );
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key, required this.title});

  final String title;

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  int _counter = 0;

  void _incrementCounter() {
    setState(() {
      _counter++;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        title: Text(widget.title),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            const Text(
              'You have pushed the button this many times:',
            ),
            Text(
              '$_counter',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _incrementCounter,
        tooltip: 'Increment',
        child: const Icon(Icons.add),
      ),
    );
  }
}\n`;
  }

  private getNodePackageJson(name: string): string {
    return JSON.stringify({
      name,
      version: '1.0.0',
      description: '',
      main: 'src/index.js',
      scripts: {
        start: 'node src/index.js',
        dev: 'nodemon src/index.js',
      },
      dependencies: {
        express: '^4.18.2',
      },
      devDependencies: {
        nodemon: '^2.0.20',
      },
    }, null, 2);
  }

  private getNodeIndex(): string {
    return `const server = require('./server');

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});\n`;
  }

  private getNodeServer(): string {
    return `const express = require('express');
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Hello, World!' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = app;\n`;
  }

  private getPythonRequirements(): string {
    return `flask==2.3.0
python-dotenv==1.0.0\n`;
  }

  private getPythonApp(): string {
    return `from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello():
    return {'message': 'Hello, World!'}

@app.route('/api/health')
def health():
    return {'status': 'ok'}

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)\n`;
  }

  private getAndroidMain(): string {
    return `package com.example;

import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
    }
}\n`;
  }

  private getAndroidManifest(): string {
    return `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="My App">
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>\n`;
  }

  private getAndroidGradle(): string {
    return `plugins {
    id 'com.android.application'
}

android {
    namespace 'com.example'
    compileSdk 33

    defaultConfig {
        applicationId "com.example"
        minSdk 24
        targetSdk 33
        versionCode 1
        versionName "1.0"
    }
}\n`;
  }

  private getIOSApp(): string {
    return `import SwiftUI

@main
struct MyApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}\n`;
  }

  private getIOSContentView(): string {
    return `import SwiftUI

struct ContentView: View {
    @State private var counter = 0
    
    var body: some View {
        VStack {
            Text("Hello, World!")
                .font(.largeTitle)
            Button("Tap me") {
                counter += 1
            }
            Text("Count: \\(counter)")
        }
        .padding()
    }
}\n`;
  }

  private getIOSInfoPlist(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>en</string>
    <key>CFBundleDisplayName</key>
    <string>My App</string>
</dict>
</plist>\n`;
  }

  private getVuePackageJson(name: string): string {
    return JSON.stringify({
      name,
      version: '0.1.0',
      private: true,
      scripts: {
        serve: 'vue-cli-service serve',
        build: 'vue-cli-service build',
      },
      dependencies: {
        vue: '^3.3.0',
      },
    }, null, 2);
  }

  private getVueMain(): string {
    return `import { createApp } from 'vue';
import App from './App.vue';

createApp(App).mount('#app');\n`;
  }

  private getVueApp(): string {
    return `<template>
  <div id="app">
    <h1>Welcome to Vue.js</h1>
    <p>{{ message }}</p>
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      message: 'Hello, World!'
    }
  }
}
</script>

<style>
#app {
  text-align: center;
  margin-top: 60px;
}
</style>\n`;
  }

  private getVueHTML(name: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name}</title>
</head>
<body>
  <div id="app"></div>
</body>
</html>\n`;
  }

  private getHTMLIndex(name: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${name}</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <h1>Welcome to ${name}</h1>
        <p>Start building your web application!</p>
        <button id="clickBtn">Click Me</button>
        <p id="output"></p>
    </div>
    <script src="script.js"></script>
</body>
</html>\n`;
  }

  private getHTMLCSS(): string {
    return `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: Arial, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
}

.container {
    background: white;
    padding: 2rem;
    border-radius: 10px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    text-align: center;
}

button {
    padding: 10px 20px;
    font-size: 16px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    margin-top: 20px;
}

button:hover {
    background: #5568d3;
}\n`;
  }

  private getHTMLJS(): string {
    return `document.getElementById('clickBtn').addEventListener('click', function() {
    const output = document.getElementById('output');
    output.textContent = 'Button clicked! ' + new Date().toLocaleTimeString();
});\n`;
  }

  private getGoMod(name: string): string {
    return `module ${name}

go 1.21\n`;
  }

  private getGoMain(): string {
    return `package main

import (
    "fmt"
    "net/http"
)

func main() {
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintf(w, "Hello, World!")
    })
    
    fmt.Println("Server starting on :8080")
    http.ListenAndServe(":8080", nil)
}\n`;
  }

  private getRustCargo(name: string): string {
    return `[package]
name = "${name}"
version = "0.1.0"
edition = "2021"

[dependencies]\n`;
  }

  private getRustMain(): string {
    return `fn main() {
    println!("Hello, World!");
}\n`;
  }

  private getJavaPOM(name: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.example</groupId>
    <artifactId>${name}</artifactId>
    <version>1.0.0</version>
    <packaging>jar</packaging>
    
    <properties>
        <maven.compiler.source>17</maven.compiler.source>
        <maven.compiler.target>17</maven.compiler.target>
    </properties>
    
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
            <version>3.1.0</version>
        </dependency>
    </dependencies>
</project>\n`;
  }

  private getJavaApp(): string {
    return `package com.example;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}

@RestController
class HelloController {
    @GetMapping("/")
    public String hello() {
        return "Hello, World!";
    }
}\n`;
  }

  private getJavaProperties(): string {
    return `server.port=8080
spring.application.name=myapp\n`;
  }

  private getGitignore(type: string): string {
    const gitignores: Record<string, string> = {
      node: `node_modules/
.env
dist/
build/
*.log
.DS_Store\n`,
      python: `__pycache__/
*.py[cod]
*$py.class
.env
venv/
.venv\n`,
      flutter: `.dart_tool/
.flutter-plugins
.flutter-plugins-dependencies
.packages
.pub-cache/
build/
*.iml\n`,
      android: `*.iml
.gradle/
/local.properties
/.idea/
/build
*.apk
*.ap_\n`,
      ios: `*.xcworkspace
!default.xcworkspace
xcuserdata/
*.xcuserdatad
DerivedData/\n`,
      go: `*.exe
*.exe~
*.dll
*.so
*.dylib
*.test
vendor/\n`,
      rust: `target/
Cargo.lock
**/*.rs.bk\n`,
      java: `target/
.classpath
.project
.settings/\n`,
    };
    return gitignores[type] || `*.log
.DS_Store\n`;
  }

  // README generators
  private getReactREADME(name: string): string {
    return `# ${name}

This project was created with React.

## Getting Started

\`\`\`bash
npm install
npm start
\`\`\`

Open [http://localhost:3000](http://localhost:3000) to view it in the browser.\n`;
  }

  private getFlutterREADME(name: string): string {
    return `# ${name}

A Flutter project.

## Getting Started

\`\`\`bash
flutter pub get
flutter run
\`\`\`\n`;
  }

  private getNodeREADME(name: string): string {
    return `# ${name}

Node.js backend application.

## Getting Started

\`\`\`bash
npm install
npm start
\`\`\`

Server runs on http://localhost:3000\n`;
  }

  private getPythonREADME(name: string): string {
    return `# ${name}

Python web application.

## Getting Started

\`\`\`bash
pip install -r requirements.txt
python app.py
\`\`\`

Server runs on http://localhost:5000\n`;
  }

  private getAndroidREADME(name: string): string {
    return `# ${name}

Android application.

## Getting Started

Open in Android Studio and run on an emulator or device.\n`;
  }

  private getIOSREADME(name: string): string {
    return `# ${name}

iOS application.

## Getting Started

Open in Xcode and run on a simulator or device.\n`;
  }

  private getVueREADME(name: string): string {
    return `# ${name}

Vue.js application.

## Getting Started

\`\`\`bash
npm install
npm run serve
\`\`\`\n`;
  }

  private getHTMLREADME(name: string): string {
    return `# ${name}

HTML/CSS/JavaScript web application.

## Getting Started

Open \`index.html\` in your browser.\n`;
  }

  private getGoREADME(name: string): string {
    return `# ${name}

Go application.

## Getting Started

\`\`\`bash
go run main.go
\`\`\`

Server runs on http://localhost:8080\n`;
  }

  private getRustREADME(name: string): string {
    return `# ${name}

Rust application.

## Getting Started

\`\`\`bash
cargo run
\`\`\`\n`;
  }

  private getJavaREADME(name: string): string {
    return `# ${name}

Java Spring Boot application.

## Getting Started

\`\`\`bash
mvn spring-boot:run
\`\`\`

Server runs on http://localhost:8080\n`;
  }
}

