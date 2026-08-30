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
