# Como fazer Deploy na Vercel

O projeto está pronto para ser implantado na Vercel. Siga um dos métodos abaixo:

## Método 1: Usando Git (Recomendado)

1.  **Push para GitHub/GitLab/Bitbucket:**
    *   Crie um repositório no seu provedor Git.
    *   Faça o push deste código para o repositório:
        ```bash
        git remote add origin <URL_DO_SEU_REPOSITORIO>
        git branch -M main
        git push -u origin main
        ```

2.  **Conecte na Vercel:**
    *   Acesse [vercel.com](https://vercel.com) e faça login.
    *   Clique em "Add New..." > "Project".
    *   Importe o repositório que você acabou de criar.

3.  **Configuração do Projeto:**
    *   **Framework Preset:** Vite
    *   **Root Directory:** `./` (deixe o padrão)
    *   **Environment Variables:** Adicione as variáveis do seu arquivo `.env`:
        *   `VITE_SUPABASE_URL`
        *   `VITE_SUPABASE_PROJECT_ID`
        *   `VITE_SUPABASE_PUBLISHABLE_KEY`
        *   `VITE_MERCADO_PAGO_ACCESS_TOKEN`
    *   Clique em "Deploy".

## Método 2: Vercel CLI

Se você tiver o Vercel CLI instalado (`npm i -g vercel`):

1.  Execute o comando no terminal:
    ```bash
    vercel
    ```
2.  Siga as instruções na tela:
    *   Set up and deploy? **Yes**
    *   Scope? **(Seu usuário)**
    *   Link to existing project? **No**
    *   Project name? **cortefacilapp**
    *   Directory? **./**
    *   Want to modify settings? **No** (Detectará Vite automaticamente)
    *   Environment variables? **Yes** (Importante adicionar as variáveis listadas acima)

## Configurações Importantes

*   **Arquivo `vercel.json`:** Já foi criado na raiz do projeto para garantir que o roteamento (React Router) funcione corretamente, redirecionando todas as requisições para `index.html`.
*   **Variáveis de Ambiente:** É crucial configurar as variáveis de ambiente no painel da Vercel para que a conexão com o Supabase e o Mercado Pago funcione.
