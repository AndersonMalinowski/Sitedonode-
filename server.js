const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const session = require('express-session'); // Importa o controle de sessões
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Configuração da Sessão na memória
app.use(session({
    secret: 'chave-secreta-alpha-supps-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 2 * 60 * 60 * 1000 } // Sessão expira em 2 horas de inatividade
}));

const db = new sqlite3.Database('./lojasuplementos.db');

// --- MIDDLEWARE DE PROTEÇÃO (O GUARDA DO SITE) ---
function verificarAutenticacao(req, res, next) {
    // Se o usuário pedir a página de login ou os arquivos de estilo, permite o acesso
    if (req.path === '/login.html' || req.path === '/login' || req.path === '/estilo.css') {
        return next();
    }
    
    // Se ele estiver logado, permite continuar para a página desejada
    if (req.session && req.session.autenticado) {
        return next();
    }
    
    // Se não estiver logado e tentar acessar qualquer outra coisa, é barrado e mandado pro login
    res.redirect('/login.html');
}

// Aplica o guarda de segurança antes de liberar a pasta pública do site
app.use(verificarAutenticacao);
app.use(express.static('.'));


// --- BANCO DE DADOS (ESTRUTURA INICIAL) ---
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        nome TEXT NOT NULL, 
        cpf TEXT NOT NULL, 
        telefone TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS produtos (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        descricao TEXT NOT NULL, 
        preco REAL NOT NULL, 
        peso_gramas INTEGER NOT NULL,
        estoque INTEGER NOT NULL DEFAULT 100
    )`, () => {
        db.get(`SELECT COUNT(*) as total FROM produtos`, [], (err, row) => {
            if (!err && row.total === 0) {
                console.log("Populando catálogo de suplementos com 100 unidades cada...");
                const stmt = db.prepare(`INSERT INTO produtos (descricao, preco, peso_gramas, estoque) VALUES (?, ?, ?, 100)`);
                const marcas = ["Max Titanium", "Growth Supplements", "IntegralMedica", "Probiotica"];
                for (let i = 1; i <= 10; i++) {
                    stmt.run(`Whey Protein 80% - ${marcas[i % marcas.length]}`, 99.90, 900);
                    stmt.run(`Creatina Monohidratada Pure - ${marcas[i % marcas.length]}`, 75.00, 300);
                }
                stmt.finalize();
            }
        });
    });

    db.run(`CREATE TABLE IF NOT EXISTS pedidos (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        data TEXT NOT NULL, 
        cliente_id INTEGER,
        forma_pagamento TEXT NOT NULL, 
        total REAL NOT NULL,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS itens_pedido (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        pedido_id INTEGER, 
        produto_id INTEGER, 
        preco_cobrado REAL NOT NULL,
        whitespace_fix INTEGER,
        quantidade INTEGER NOT NULL,
        FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
        FOREIGN KEY (produto_id) REFERENCES produtos(id)
    )`);
});


// --- ROTA DE LOGIN (AUTENTICAÇÃO) ---
app.post('/login', (req, res) => {
    const { senha } = req.body;
    
    if (senha === '1234') {
        req.session.autenticado = true; // Cria o registro de logado na sessão do navegador
        res.redirect('/index.html');    // Direciona para a Home de forma segura
    } else {
        res.redirect('/login.html?erro=1'); // Retorna ao login exibindo erro de senha inválida
    }
});

// --- ROTA DE LOGOUT (SAIR) ---
app.get('/logout', (req, res) => {
    req.session.destroy(); // Apaga a sessão ativa
    res.redirect('/login.html');
});


// --- ROTAS DE CLIENTES ---
app.post('/salvar-cliente', (req, res) => {
    const { nome, cpf, telefone } = req.body;
    db.run(`INSERT INTO clientes (nome, cpf, telefone) VALUES (?, ?, ?)`, [nome, cpf, telefone], function(err) {
        if (err) return res.status(500).send("Erro ao cadastrar cliente.");
        res.redirect('/clientes.html');
    });
});

app.get('/listar-clientes', (req, res) => {
    db.all(`SELECT * FROM clientes ORDER BY nome`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.put('/editar-cliente/:id', (req, res) => {
    const { id } = req.params;
    const { nome, cpf, telefone } = req.body;
    db.run(`UPDATE clientes SET nome = ?, cpf = ?, telefone = ? WHERE id = ?`, [nome, cpf, telefone, id], function(err) {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

app.delete('/excluir-cliente/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM clientes WHERE id = ?`, [id], function(err) {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});


// --- ROTAS DE PRODUTOS ---
app.post('/salvar-produto', (req, res) => {
    const { descricao, preco, peso_gramas, estoque } = req.body;
    const qtdEstoque = estoque ? parseInt(estoque) : 100;
    db.run(`INSERT INTO produtos (descricao, preco, peso_gramas, estoque) VALUES (?, ?, ?, ?)`, [descricao, preco, peso_gramas, qtdEstoque], function(err) {
        if (err) return res.status(500).send("Erro ao cadastrar produto.");
        res.redirect('/produtos.html');
    });
});

app.get('/listar-produtos', (req, res) => {
    db.all(`SELECT * FROM produtos ORDER BY descricao`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.put('/editar-produto/:id', (req, res) => {
    const { id } = req.params;
    const { descricao, preco, peso_gramas, estoque } = req.body;
    db.run(`UPDATE produtos SET descricao = ?, preco = ?, peso_gramas = ?, estoque = ? WHERE id = ?`, [descricao, preco, peso_gramas, estoque, id], function(err) {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

app.delete('/excluir-produto/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM produtos WHERE id = ?`, [id], function(err) {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});


// --- ROTAS DE PEDIDOS ---
app.post('/finalizar-pedido', (req, res) => {
    const { cliente_id, forma_pagamento, total, itens } = req.body;
    const dataAtual = new Date().toLocaleString('pt-BR');

    db.run(`INSERT INTO pedidos (data, cliente_id, forma_pagamento, total) VALUES (?, ?, ?, ?)`, 
    [dataAtual, cliente_id, forma_pagamento, total], function(err) {
        if (err) return res.status(500).json({ success: false });
        
        const pedidoId = this.lastID;
        const stmtItem = db.prepare(`INSERT INTO itens_pedido (pedido_id, produto_id, preco_cobrado, quantidade) VALUES (?, ?, ?, ?)`);
        const stmtEstoque = db.prepare(`UPDATE produtos SET estoque = estoque - ? WHERE id = ?`);
        
        try {
            itens.forEach(item => {
                stmtItem.run([pedidoId, item.id, item.preco, item.quantidade]);
                stmtEstoque.run([item.quantidade, item.id]);
            });
            stmtItem.finalize();
            stmtEstoque.finalize();
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ success: false });
        }
    });
});

app.get('/listar-pedidos', (req, res) => {
    const sql = `SELECT p.id, p.data, p.forma_pagamento, p.total, c.nome as nome_cliente FROM pedidos p LEFT JOIN clientes c ON p.cliente_id = c.id ORDER BY p.id DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/detalhes-pedido/:id', (req, res) => {
    db.all(`SELECT i.preco_cobrado, i.whitespace_fix, i.quantidade, pr.descricao, pr.peso_gramas FROM itens_pedido i INNER JOIN produtos pr ON i.produto_id = pr.id WHERE i.pedido_id = ?`, [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.listen(3000, () => console.log("Servidor Alpha Supps Protegido Rodando na Porta 3000!"));
