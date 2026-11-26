# MotorNews · S2000 Terminal

Site estático em português com arquivo do Honda S2000, manifesto F.E.V. e simulador de telemetria. O simulador não recebe dados de um veículo. O registro de um nó FEV-01 é opcional e usa Firebase Authentication e Cloud Firestore.

## Desenvolvimento

Requisitos: Node.js 24 e npm. O modo padrão não exige Firebase ou variáveis de ambiente.

```sh
npm ci --ignore-scripts
npm run dev
```

Abra o endereço exibido pelo Vite. Em **Simulador**, acompanhe a rotação e a temperatura estimadas. Em **Engenharia**, veja o estado do registro na nuvem. Os vídeos de fundo só baixam quando solicitados; o restante do site funciona se a mídia externa falhar.

## Arquitetura

- `index.html`: conteúdo, navegação e diálogos nativos, com a URL histórica redirecionada para a raiz.
- `src/`: TypeScript estrito para simulação, controles de mídia e integração com o Firebase, carregada apenas com configuração.
- `firestore.rules`: nega o acesso por padrão. Apenas o titular autenticado por e-mail/senha pode ler e criar o seu documento `users/{uid}/telemetry/FEV-01`.
- `deploy/default.conf`: política de conteúdo, cabeçalhos de segurança e cache do Nginx. O build inclui a versão aplicável da política no HTML para hospedeiros estáticos.

O registro usa uma transação e um caminho fixo por UID. Cliques repetidos ou sessões concorrentes não criam duplicatas. O documento contém apenas `node` e `createdAt`, com carimbo do servidor. Usuários não podem listar registros, alterar ou apagar esse documento pelo cliente. A senha é processada pelo Firebase Auth, não pelo Firestore; a sessão fica na memória e se encerra ao recarregar a página.

## Habilitar o registro em nuvem

1. Em um projeto Firebase dedicado, crie um app web e ative Authentication → **E-mail/senha** e Cloud Firestore. Adicione o domínio de produção e configure proteções de enumeração de e-mail e quotas no provedor. Use projetos distintos para homologação e produção.
2. Revise e aplique as regras ao projeto escolhido com `firebase deploy --only firestore:rules --project <id-do-projeto>`. Esse comando substitui as regras do projeto; não o execute em um projeto compartilhado sem integrar e revisar as políticas existentes.
3. Copie `.env.example` para `.env.local` e preencha os quatro valores públicos do app web. Não inclua conta de serviço, chave privada nem credencial de administrador.

| Variável               | Valor da configuração web do Firebase  |
| ---------------------- | -------------------------------------- |
| `FIREBASE_API_KEY`     | `apiKey`                               |
| `FIREBASE_AUTH_DOMAIN` | `authDomain`, sem protocolo ou caminho |
| `FIREBASE_PROJECT_ID`  | `projectId`                            |
| `FIREBASE_APP_ID`      | `appId`                                |

O build rejeita configurações parciais ou malformadas. Com os quatro campos vazios, **Entrar** e o registro em nuvem não são oferecidos. Com o Firebase configurado, crie uma conta ou entre, abra **Engenharia** e selecione **Registrar nó FEV-01**. Monitore falhas e consumo no Console Firebase; exclusões de conta e de registro devem ser atendidas pelo administrador do projeto.

A política de conteúdo não carrega scripts externos de autenticação. Se o projeto exigir reCAPTCHA Enterprise para login por e-mail/senha, valide uma política específica em homologação antes de publicar; essa configuração não é suportada pela política padrão.

**Autorizações legadas:** o código antigo tinha um caminho que podia gravar senhas em texto puro na coleção `artifacts/{appId}/public/data/accounts`. Este build não lê, migra nem grava esses documentos. Antes de reutilizar o projeto anterior, audite acesso e existência de dados nessas coleções, restrinja as regras e trate redefinição de credenciais e remoção de dados conforme o resultado. Não importe senhas em texto puro.

## Verificação

```sh
npm run format:check && npm run lint && npm run typecheck
npm audit --audit-level=moderate
npx playwright install chromium
npm run test:unit
npm run test:browser
npm run test:firebase
```

Os testes de Firebase exigem Java 21+ e o [Firebase CLI](https://firebase.google.com/docs/cli#install_the_firebase_cli) (`15.37.0` no CI) no PATH. Eles usam apenas os emuladores locais Auth (9099) e Firestore (8081), com o projeto `demo-motornews`. Nenhuma credencial real é necessária. A cobertura unitária é medida para a configuração e o modelo de telemetria; Playwright cobre a interface, autenticação, concorrência e regras de propriedade.

## Build e deploy

```sh
npm run build
npm run preview
```

Publique apenas `dist/`, sobre HTTPS. O preview é apenas para verificação local. Para um servidor estático diferente do Nginx abaixo, aplique os cabeçalhos de `deploy/default.conf` no host; em particular, `frame-ancestors` precisa de um cabeçalho HTTP. Adicione HSTS no terminador HTTPS quando o domínio estiver pronto. Use cache imutável apenas nos assets com hash e revalidação para HTML.

```sh
docker build -t motornews .
docker run --rm -p 127.0.0.1:8080:8080 --read-only --tmpfs /tmp --cap-drop=ALL \
  --security-opt=no-new-privileges motornews
```

O contêiner executa Nginx sem root. Para habilitar o Firebase no build Docker, monte a configuração web durante o build. O hash invalida o cache quando o arquivo muda; o arquivo não é copiado para a imagem final.

```sh
docker build -t motornews --secret id=firebase-web,src=.env.local \
  --build-arg FIREBASE_CONFIG_DIGEST="$(sha256sum .env.local | cut -d ' ' -f 1)" .
```

## Créditos e mídia

Ícones: [Font Awesome Free 6.7.2](https://fontawesome.com/), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Fontes Bebas Neue e Space Mono: [SIL Open Font License](https://openfontlicense.org/). A página mantém os links originais para imagens do Unsplash e clipes hospedados no S3; confirme direitos de uso dos clipes antes de publicar comercialmente. MotorNews não é afiliado à Honda.
