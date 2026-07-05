const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const session = require('express-session'); // Adicionado para controle de acesso
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

// --- MIDDLEWARE DE PROTEÇÃO (SÓ ACESSA COM SENHA) ---
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

db.serialize(() => {
    // 1. Tabela de Clientes
    db.run(`CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        nome TEXT NOT NULL, 
        cpf TEXT NOT NULL, 
        telefone TEXT NOT NULL
    )`);

    // 2. Tabela de Produtos (Original)
    db.run(`CREATE TABLE IF NOT EXISTS produtos (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        descricao TEXT NOT NULL, 
        preco REAL NOT NULL, 
        peso_gramas INTEGER NOT NULL
    )`, () => {
        db.get(`SELECT COUNT(*) as total FROM produtos`, [], (err, row) => {
            if (!err && row.total === 0) {
                console.log("Populando catálogo de suplementos (150 itens)...");
                const stmt = db.prepare(`INSERT INTO produtos (descricao, preco, peso_gramas) VALUES (?, ?, ?)`);
                
                const marcas = ["Max Titanium", "Growth Supplements", "IntegralMedica", "Probiotica", "Optimun Nutrition", "Darkness", "Black Skull"];
                const sabores = ["Baunilha", "Chocolate", "Morango", "Cookies", "Banana", "Sem Sabor"];
                const frutas = ["Frutas Vermelhas", "Limão", "Melancia", "Uva", "Maçã Verde"];

                let count = 1;
                for (let m of marcas) {
                    for (let s of sabores) {
                        if (count <= 40) {
                            stmt.run(`Whey Protein Concentrado 80% - ${m} (${s})`, (89.90 + (count * 1.50)).toFixed(2), 900);
                            count++;
                        }
                    }
                }
                for (let i = 1; i <= 15; i++) {
                    stmt.run(`Whey Protein Isolado 100% ISO - ${marcas[i % marcas.length]} (${sabores[i % sabores.length]})`, (149.90 + (i * 3)).toFixed(2), 900);
                    stmt.run(`Hydro Whey Premium - ${marcas[i % marcas.length]}`, (210.00 + (i * 2.5)).toFixed(2), 750);
                }
                for (let i = 1; i <= 15; i++) {
                    stmt.run(`Creatina Monohidratada Pure - ${marcas[i % marcas.length]}`, (65.00 + (i * 2)).toFixed(2), 300);
                    stmt.run(`Creatina Creapure Importada - ${marcas[i % marcas.length]}`, (95.50 + (i * 1.8)).toFixed(2), 250);
                }
                for (let i = 1; i <= 15; i++) {
                    stmt.run(`BCAA Pump Max 4:1:1 - ${marcas[i % marcas.length]} (${frutas[i % frutas.length]})`, (45.00 + (i * 1.2)).toFixed(2), 200);
                    stmt.run(`Glutamina L-Glutamine Pure - ${marcas[i % marcas.length]}`, (59.90 + (i * 1.1)).toFixed(2), 300);
                }
                for (let i = 1; i <= 15; i++) {
                    stmt.run(`Hipercalórico Mass Gainer - ${marcas[i % marcas.length]} (${sabores[i % sabores.length]})`, (49.90 + (i * 2)).toFixed(2), 3000);
                }
                for (let i = 1; i <= 10; i++) {
                    stmt.run(`Pré-Treino C4 Beta Pump - ${marcas[i % marcas.length]} (${frutas[i % frutas.length]})`, (85.00 + (i * 2.2)).toFixed(2), 300);
                }
                stmt.finalize();
                console.log("Banco de dados populado com sucesso!");
            }
        });
    });

    // 3. Tabela Mestre: Pedidos
    db.run(`CREATE TABLE IF NOT EXISTS pedidos (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        data TEXT NOT NULL, 
        cliente_id INTEGER,
        forma_pagamento TEXT NOT NULL, 
        total REAL NOT NULL,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id)
    )`);

    // 4. Tabela Detalhe: Itens do Pedido
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

// --- ROTA DE LOGIN ---
app.post('/login', (req, res) => {
    const { senha } = req.body;
    if (senha === '1234') {
        req.session.autenticado = true;
        res.redirect('/index.html');
    } else {
        res.redirect('/login.html?erro=1');
    }
});

// --- ROTA DE LOGOUT ---
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

// --- ROTAS DE PRODUTOS ---
app.post('/salvar-produto', (req, res) => {
    const { descricao, preco, peso_gramas } = req.body;
    db.run(`INSERT INTO produtos (descricao, preco, peso_gramas) VALUES (?, ?, ?)`, [descricao, preco, peso_gramas], function(err) {
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

// --- ROTAS DE PEDIDOS (HISTÓRICO) ---
app.post('/finalizar-pedido', (req, res) => {
    const { cliente_id, forma_pagamento, total, itens } = req.body;
    const dataAtual = new Date().toLocaleString('pt-BR');

    db.run(`INSERT INTO pedidos (data, cliente_id, forma_pagamento, total) VALUES (?, ?, ?, ?)`, 
    [dataAtual, cliente_id, forma_pagamento, total], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        const pedidoId = this.lastID;
        const stmt = db.prepare(`INSERT INTO itens_pedido (pedido_id, produto_id, preco_cobrado, quantidade) VALUES (?, ?, ?, ?)`);
        
        try {
            itens.forEach(item => {
                stmt.run([pedidoId, item.id, item.preco, item.quantidade]);
            });
            stmt.finalize();
            res.json({ success: true });
        } catch (stmtError) {
            res.status(500).json({ error: "Erro ao processar a lista de itens do carrinho." });
        }
    });
});

app.get('/listar-pedidos', (req, res) => {
    const sql = `
        SELECT p.id, p.data, p.forma_pagamento, p.total, c.nome as nome_cliente 
        FROM pedidos p 
        INNER JOIN clientes c ON p.cliente_id = c.id 
        ORDER BY p.id DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/detalhes-pedido/:id', (req, res) => {
    const { id } = req.params;
    const sql = `
        SELECT i.preco_cobrado, i.quantidade, pr.descricao, pr.peso_gramas 
        FROM itens_pedido i 
        INNER JOIN produtos pr ON i.produto_id = pr.id 
        WHERE i.pedido_id = ?`;
    db.all(sql, [id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.listen(3000, () => console.log("Servidor Alpha Supps Ativo na porta 3000!"));
