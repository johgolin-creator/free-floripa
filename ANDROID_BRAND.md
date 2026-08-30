# Marca Android do PONT

O ícone e a splash screen do Android são gerados por código, a partir dos
tokens da marca PONT (fundo grafite escuro + anel verde-limão), sem depender
de nenhum arquivo de imagem. Os tokens ficam em
`scripts/generate-android-brand-assets.ps1` e devem bater com
`src/components/BrandLogo.tsx` e `public/favicon.svg`.

Para regenerar o ícone e a splash screen do Android:

```powershell
.\scripts\generate-android-brand-assets.ps1
```

O script atualiza os arquivos dentro de:

```text
android/app/src/main/res
```

Depois de mudar o app web, rode também:

```powershell
pnpm cap:sync
```
