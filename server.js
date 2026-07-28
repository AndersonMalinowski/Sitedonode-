const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const session = require('express-session');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Configuração da Sessão (Expira em 2 horas de inatividade)
app.use(session({
    secret: 'chave-secreta-alpha-supps-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 2 * 60 * 60 * 1000 }
}));

const db = new sqlite3.Database('./lojasuplementos.db');

// --- MIDDLEWARE DE PROTEÇÃO (SÓ PASSA COM SENHA) ---
function verificarAutenticacao(req, res, next) {
    if (req.path === '/login.html' || req.path === '/login' || req.path === '/estilo.css') {
        return next();
    }
    if (req.session && req.session.autenticado) {
        return next();
    }
    res.redirect('/login.html');
}

app.use(verificarAutenticacao);
app.use(express.static('.'));

// --- ESTRUTURA DO BANCO DE DADOS ---
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
                console.log("Populando catálogo de suplementos com stock inicial...");
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
        quantidade INTEGER NOT NULL,
        FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
        FOREIGN KEY (produto_id) REFERENCES produtos(id)
    )`);
});

// --- ROTAS DE AUTENTICAÇÃO ---
app.post('/login', (req, res) => {
    const { senha } = req.body;
    if (senha === '1234') {
        req.session.autenticado = true;
        res.redirect('/index.html');
    } else {
        res.redirect('/login.html?erro=1');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
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

// --- ROTAS DE VENDAS (HISTÓRICO PERMANENTE) ---
app.post('/finalizar-pedido', (req, res) => {
    const { cliente_id, forma_pagamento, total, itens } = req.body;
    const dataAtual = new Date().toLocaleString('pt-BR');

    if (!cliente_id || !itens || itens.length === 0) {
        return res.status(400).json({ success: false, error: "Dados incompletos." });
    }

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
    db.all(`SELECT i.preco_cobrado, i.quantidade, pr.descricao, pr.peso_gramas FROM itens_pedido i INNER JOIN produtos pr ON i.produto_id = pr.id WHERE i.pedido_id = ?`, [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.listen(3000, () => console.log("Servidor Alpha Supps rodando na porta 3000!"));
