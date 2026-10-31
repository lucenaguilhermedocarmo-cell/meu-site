# ROBLOX GOLD

Site em Node.js/Express com busca de perfil Roblox, etapas da campanha e envio de comprovante para análise manual.

## Arquivos

- `server.js`: servidor, consulta de perfil e endpoint de upload.
- `public/`: página, estilos e JavaScript do navegador.
- `package.json`: dependências e comando de inicialização.

## Executar localmente

Requer Node.js 18 ou superior.

```bash
npm install
npm start
```

Abra `http://localhost:3000`. Não abra `public/index.html` diretamente, pois o envio de comprovantes precisa do servidor.

## Publicar

Envie a pasta do projeto para um serviço que execute aplicações Node.js. O comando de inicialização é `npm start`; a plataforma deve fornecer a porta pela variável `PORT`.

O servidor grava os comprovantes em `uploads/`. Em hospedagens com disco persistente, configure `UPLOAD_DIR` para o caminho do disco montado. Sem armazenamento persistente, os arquivos podem ser apagados quando a aplicação reiniciar ou for publicada novamente.

O GitHub armazena o código, mas não executa `server.js` por si só. GitHub Pages não suporta o endpoint de upload deste projeto.
