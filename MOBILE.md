# Free Floripa como aplicativo

Este projeto agora está preparado para virar aplicativo Android e iOS com Capacitor.

## O que foi configurado

- Nome do app: Free Floripa
- ID do app: com.freefloripa.app
- Pasta usada pelo app nativo: dist
- Build mobile usando o mesmo Free Floripa já criado

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

Sempre que fizer mudanças no Free Floripa, rode:

```bash
pnpm cap:sync
```

Isso atualiza os projetos nativos Android/iOS com a versão mais nova do app.
