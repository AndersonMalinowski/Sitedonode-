const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('.'));

const db = new sqlite3.Database('./lojasuplementos.db');

db.serialize(() => {
    // 1. Tabela de Clientes
    db.run(`CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        nome TEXT NOT NULL, 
        cpf TEXT NOT NULL, 
        telefone TEXT NOT NULL
    )`);

    // 2. Tabela de Produtos
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
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true });
    });
});

app.delete('/excluir-cliente/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM clientes WHERE id = ?`, [id], function(err) {
        if (err) return res.status(500).json({ success: false, error: err.message });
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
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true });
    });
});

app.delete('/excluir-produto/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM produtos WHERE id = ?`, [id], function(err) {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true });
    });
});

// --- ROTA CORRIGIDA: FINALIZAR PEDIDO (HISTÓRICO) ---
app.post('/finalizar-pedido', (req, res) => {
    const { cliente_id, forma_pagamento, total, itens } = req.body;
    const dataAtual = new Date().toLocaleString('pt-BR');

    // Validação básica backend
    if (!cliente_id || !itens || itens.length === 0) {
        return res.status(400).json({ success: false, error: "Dados incompletos." });
    }

    db.run(`INSERT INTO pedidos (data, cliente_id, forma_pagamento, total) VALUES (?, ?, ?, ?)`, 
    [dataAtual, cliente_id, forma_pagamento, total], function(err) {
        if (err) return res.status(500).json({ success: false, error: err.message });
        
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
        } catch (stmtError) {
            res.status(500).json({ success: false, error: "Erro ao processar itens." });
        }
    });
});

app.get('/listar-pedidos', (req, res) => {
    const sql = `
        SELECT p.id, p.data, p.forma_pagamento, p.total, c.nome as nome_cliente 
        FROM pedidos p 
        LEFT JOIN clientes c ON p.cliente_id = c.id 
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

app.listen(3000, () => console.log("Servidor Alpha Supps ativo na porta 3000!"));
