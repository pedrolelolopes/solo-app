# Ler uma pasta de folhetos com o Claude Code

Sem custo de API: usa a sua assinatura. Nenhuma chave em lugar nenhum.

## 1. Formato do arquivo (CSV)

Separador `;`. Preço com vírgula. Unidade pode ficar vazia.

```
mercado;produto;preco;unidade
Mercado Exemplo;Arroz Tipo 1 5kg;22,90;un
Mercado Exemplo;Tomate;7,99;kg
Outro Mercado;Leite Integral 1L;4,49;un
```

(Nomes de exemplo, fictícios.)

## 2. Passo a passo

1. Ponha as fotos e PDFs de um mercado numa pasta. O nome da pasta é o nome do mercado.
2. Abra o Claude Code.
3. Cole o prompt abaixo. Troque `<pasta>` pelo caminho da pasta.
4. Espere o resumo, por exemplo: `3 itens em 2 mercados; 0 linhas com erro`.

## 3. Prompt pronto (copiar e colar)

```
Leia todas as imagens e PDFs da pasta <pasta>, um arquivo por vez. Nos PDFs, leia as páginas com Read(pages=...). Use o nome da pasta como nome do mercado, a menos que eu diga outro. Extraia TODOS os produtos que tenham preço. Escreva o arquivo <pasta>\folheto.csv neste formato, com separador ponto e vírgula, preço com vírgula e a primeira linha igual a esta:
mercado;produto;preco;unidade
Unidade: kg, g, L, ml, un ou vazio. Não invente produto nem preço; se não der para ler, pule. Depois rode: python C:\dev\solo-app\scripts\folhetos_csv.py <pasta>\folheto.csv e me mostre o resumo que ele imprimir.
```

O script confere o arquivo, tira repetidos e guarda uma cópia do original em `folheto.csv.bak`.

## 4. Levar ao app

1. Salve o `folheto.csv` no Drive, ou mande para você mesmo no WhatsApp.
2. Abra o app e entre na sua conta.
3. Toque em **Folhetos**.
4. Toque em **Importar CSV** e escolha o arquivo.
