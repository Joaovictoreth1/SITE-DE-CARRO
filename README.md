# S2K Engineering Terminal

Catálogo automotivo com telemetria simulada, interface estática e integração opcional com Firebase. Não forneça dados pessoais na demonstração.

## Rodar localmente

Na raiz do repositório, execute:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Abra <http://localhost:8000/>.

## Estrutura

`s2k_engineering_terminal.html`: catálogo, autenticação e telemetria. `index.html`: entrada que preserva a URL anterior.

A configuração web do Firebase identifica o projeto e não é um segredo. Para habilitar os recursos conectados no seu ambiente, use seu projeto de teste, habilite os provedores de login necessários, configure os domínios autorizados e restrinja as regras do Firestore antes de divulgar o site. Se o modo Canvas já gravou credenciais em documentos `accounts`, restrinja o acesso, remova os dados antigos e solicite a troca de quaisquer senhas reutilizadas. A verificação local não requer credenciais nem acessa esse banco.

A CI valida o HTML e verifica arquivos e âncoras locais. Links e serviços externos não são consultados pela CI.
