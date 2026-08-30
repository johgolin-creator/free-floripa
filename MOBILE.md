# PONT como aplicativo

Este projeto está preparado para virar aplicativo Android e iOS com Capacitor.

## O que foi configurado

- Nome do app: PONT
- ID do app (bundle id, interno): com.freefloripa.app
- Pasta usada pelo app nativo: dist
- Build mobile usando o mesmo PONT já criado

> O bundle id `com.freefloripa.app` é herdado da primeira configuração do
> projeto. Ele não aparece para o usuário (que vê apenas "PONT") e não pode
> ser alterado depois da primeira publicação na Play Store.

## Primeiro uso

Instale as dependências do Capacitor:

```bash
pnpm add @capacitor/core@^8.4.0 @capacitor/android@^8.4.0 @capacitor/ios@^8.4.0
pnpm add -D @capacitor/cli@^8.4.0
```

Crie o projeto Android:

```bash
pnpm cap:android
```

Abra no Android Studio:

```bash
pnpm cap:open:android
```

## iOS

O iOS precisa de um Mac com Xcode. Quando estiver no Mac:

```bash
pnpm install
pnpm cap:ios
pnpm cap:open:ios
```

## Depois de alterar o app

Sempre que fizer mudanças no PONT, rode:

```bash
pnpm cap:sync
```

Isso atualiza os projetos nativos Android/iOS com a versão mais nova do app.

## Assinatura do Android (release / Play Store)

A pasta `android/` não é versionada (ver `.gitignore`), então a config de
assinatura vive só na máquina. Ela já está no `android/app/build.gradle`:
lê `android/keystore.properties` (git-ignored) quando o arquivo existe; sem
ele, o build de release sai sem assinatura, como antes.

Passo a passo:

1. Gere a chave de upload (uma vez). No terminal, com o `keytool` do JDK do
   Android Studio (ajuste o caminho se necessário):

   ```bash
   mkdir -p android/keystore
   "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" \
     -genkeypair -v -keystore android/keystore/pont-upload-key.jks \
     -keyalg RSA -keysize 2048 -validity 10000 -alias pont-upload
   ```

   Guarde o arquivo `.jks` e as senhas num cofre (gerenciador de senhas).
   Se perder, não dá pra atualizar o app na loja.

2. Copie `android/keystore.properties.example` para
   `android/keystore.properties` e preencha as senhas e o alias.

3. Gere o AAB assinado:

   ```bash
   pnpm cap:sync
   cd android && ./gradlew.bat bundleRelease
   ```

   Saída: `android/app/build/outputs/bundle/release/app-release.aab`.

4. No Play Console, ao subir o primeiro AAB, aceite o **Play App Signing**
   (o Google guarda a chave real; seu `.jks` vira a chave de upload).

Alternativa sem terminal: Android Studio → Build → *Generate Signed App
Bundle* → *Android App Bundle* → *Create new key store* (mesmo caminho e
alias acima) → release → Finish.
