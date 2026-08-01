# Marca Android do Free Floripa

O app Android local usa a marca do arquivo:

```text
src/assets/free-floripa-logo.jpg
```

Para regenerar o icone e a splash screen do Android:

```powershell
.\scripts\generate-android-brand-assets.ps1
```

O script atualiza os arquivos dentro de:

```text
android/app/src/main/res
```

Depois de mudar o app web, rode tambem:

```powershell
pnpm cap:sync
```
