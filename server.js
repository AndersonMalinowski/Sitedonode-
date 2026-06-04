const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const app = express();
const PORT = 3000;

// Configurações do ecossistema Node.js / Express
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Configuração de Sessão (Essencial para manter o carrinho ativo na memória)
app.use(session({
    secret: 'suplementfit_secret_key',
    resave: false,
    saveUninitialized: true
}));

// --- GERADOR AUTOMÁTICO DE 100 PRODUTOS (SuplementFit) ---
const marcas = ["Max Titanium", "Growth Supplements", "IntegralMedica", "Probiótica", "Optimum Nutrition"];
const tipos = [
    { nome: "Whey Protein Concentrado 1kg", preco: 149.90, cat: "Proteínas", img: "https://images.unsplash.com/photo-1579758629938-03607ccdbaba?q=80&w=400&auto=format&fit=crop" },
    { nome: "Creatina Monohidratada 300g", preco: 89.90, cat: "Aminoácidos", img: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?q=80&w=400&auto=format&fit=crop" },
    { nome: "Pré-Treino Pro Explosive 300g", preco: 115.00, cat: "Energéticos", img: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=400&auto=format&fit=crop" },
    { nome: "BCAA Amino Ultra 200 cápsulas", preco: 59.95, cat: "Aminoácidos", img: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?q=80&w=400&auto=format&fit=crop" },
    { nome: "Hipercalórico Mass Gainer 3kg", preco: 98.00, cat: "Ganho de Massa", img: "https://images.unsplash.com/photo-1546554137-f86b9593a222?q=80&w=400&auto=format&fit=crop" }
];

const produtos = [];
let idContador = 1;

// Loop multiplicador para gerar exatamente 100 produtos reais e variados
for (let i = 1; i <= 20; i++) {
    tipos.forEach(tipo => {
        const marcaAleatoria = marcas[Math.floor(Math.random() * marcas.length)];
        // Pequena variação matemática de preço baseada no lote para ficar realista
        const variacaoPreco = (tipo.preco + (Math.sin(idContador) * 12)).toFixed(2);
        
        produtos.push({
            id: idContador++,
            nome: `${tipo.nome} (Lote Ref #0${i})`,
            marca: marcaAleatoria,
            preco: parseFloat(variacaoPreco),
            categoria: tipo.cat,
            imagem: tipo.img
        });
    });
}
// ---------------------------------------------------------

// Rota Principal (Exibe a Vitrine do SuplementFit e o Carrinho de Compras)
app.get('/', (req, res) => {
    if (!req.session.carrinho) req.session.carrinho = [];
    
    res.render('index', { 
        produtos: produtos, 
        carrinho: req.session.carrinho 
    });
});

// Rota POST: Adiciona o item selecionado ao carrinho de compras
app.post('/carrinho/adicionar', (req, res) => {
    const produtoId = parseInt(req.body.produtoId);
    if (!req.session.carrinho) req.session.carrinho = [];

    const produtoEncontrado = produtos.find(p => p.id === produtoId);

    if (produtoEncontrado) {
        // Se o produto já está no carrinho, apenas soma a quantidade
        const itemNoCarrinho = req.session.carrinho.find(item => item.id === produtoId);
        if (itemNoCarrinho) {
            itemNoCarrinho.quantidade += 1;
        } else {
            req.session.carrinho.push({
                id: produtoEncontrado.id,
                nome: produtoEncontrado.nome,
                marca: produtoEncontrado.marca,
                preco: produtoEncontrado.preco,
                quantidade: 1
            });
        }
    }
    res.redirect('/');
});

// Rota POST: Limpa todos os itens do carrinho de compras
app.post('/carrinho/limpar', (req, res) => {
    req.session.carrinho = [];
    res.redirect('/');
});

// Inicialização estável do servidor
app.listen(PORT, () => {
    console.log(`🚀 SuplementFit online e rodando em http://localhost:${PORT}`);
});
