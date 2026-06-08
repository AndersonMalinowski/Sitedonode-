const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('.'));

// Banco de dados adaptado para a loja de suplementos
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
        peso_gramas INTEGER NOT NULL
    )`, () => {
        // Callback para popular a tabela com 150 produtos caso ela esteja vazia
        db.get(`SELECT COUNT(*) as total FROM produtos`, [], (err, row) => {
            if (!err && row.total === 0) {
                console.log("Populando catálogo de suplementos (150 itens)...");
                const stmt = db.prepare(`INSERT INTO produtos (descricao, preco, peso_gramas) VALUES (?, ?, ?)`);
                
                const marcas = ["Max Titanium", "Growth Supplements", "IntegralMedica", "Probiotica", "Optimun Nutrition", "Darkness", "Black Skull"];
                const sabores = ["Baunilha", "Chocolate", "Morango", "Cookies", "Banana", "Sem Sabor"];
                const frutas = ["Frutas Vermelhas", "Limão", "Melancia", "Uva", "Maçã Verde"];

                // 1. WHEY PROTEIN (Itens 1 a 40)
                let count = 1;
                for (let m of marcas) {
                    for (let s of sabores) {
                        if (count <= 40) {
                            stmt.run(`Whey Protein Concentrado 80% - ${m} (${s})`, (89.90 + (count * 1.50)).toFixed(2), 900);
                            count++;
                        }
                    }
                }
                // Isolados e Hidrolisados
                for (let i = 1; i <= 15; i++) {
                    stmt.run(`Whey Protein Isolado 100% ISO - ${marcas[i % marcas.length]} (${sabores[i % sabores.length]})`, (149.90 + (i * 3)).toFixed(2), 900);
                    stmt.run(`Hydro Whey Premium - ${marcas[i % marcas.length]}`, (210.00 + (i * 2.5)).toFixed(2), 750);
                }

                // 2. CREATINAS (Itens 41 a 70)
                for (let i = 1; i <= 15; i++) {
                    stmt.run(`Creatina Monohidratada Pure - ${marcas[i % marcas.length]}`, (65.00 + (i * 2)).toFixed(2), 300);
                    stmt.run(`Creatina Creapure Importada - ${marcas[i % marcas.length]}`, (95.50 + (i * 1.8)).toFixed(2), 250);
                }

                // 3. PRÉ-TREINOS (Itens 71 a 100)
                const preTreinos = ["C4 Beta Pump", "Horus", "Égide", "Psychotic", "Panic", "Evora Night"];
                for (let i = 1; i <= 30; i++) {
                    let pNome = preTreinos[i % preTreinos.length];
                    let fSabor = frutas[i % frutas.length];
                    stmt.run(`Pré-Treino ${pNome} Insane - (${fSabor})`, (79.90 + (i * 1.20)).toFixed(2), 300);
                }

                // 4. HIPERCALÓRICOS (Itens 101 a 120)
                for (let i = 1; i <= 20; i++) {
                    stmt.run(`Hipercalórico Mass Gainers 17500 - ${marcas[i % marcas.length]} (${sabores[i % sabores.length]})`, (59.90 + (i * 2)).toFixed(2), 3000);
                }

                // 5. AMINOÁCIDOS (BCAA / Glutamina) (Itens 121 a 140)
                for (let i = 1; i <= 10; i++) {
                    stmt.run(`BCAA 2:1:1 Pó Ultra Concentrado - (${frutas[i % frutas.length]})`, (45.00 + i).toFixed(2), 200);
                    stmt.run(`L-Glutamina Imunidade Pura`, (55.00 + (i * 1.5)).toFixed(2), 300);
                }

                // 6. VITAMINAS E TERMOGÊNICOS (Itens 141 a 150)
                const extras = ["Multivitamínico Az", "Termogênico Fire Burn", "Melatonina Drop", "Omega 3 Ultra", "ZMA Booster"];
                for (let i = 1; i <= 10; i++) {
                    stmt.run(`${extras[i % extras.length]} - 90 Caps`, (39.90 + (i * 2.2)).toFixed(2), 120);
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

// --- ROTAS DE PRODUTOS (SUPLEMENTOS) ---
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

// --- CORREÇÃO DA ROTA MESTRE-DETALHE (FINALIZAR PEDIDO) ---
app.post('/finalizar-pedido', (req, res) => {
    const { cliente_id, forma_pagamento, total, itens } = req.body;
    const dataAtual = new Date().toLocaleString('pt-BR');

    // Iniciamos uma transação manual ou controlamos com Statements para evitar problemas assíncronos
    db.run(`INSERT INTO pedidos (data, cliente_id, forma_pagamento, total) VALUES (?, ?, ?, ?)`, 
    [dataAtual, cliente_id, forma_pagamento, total], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        const pedidoId = this.lastID;
        
        // Usamos um Statement preparado para inserir os múltiplos itens de forma limpa
        const stmt = db.prepare(`INSERT INTO itens_pedido (pedido_id, produto_id, preco_cobrado, quantidade) VALUES (?, ?, ?, ?)`);
        
        try {
            itens.forEach(item => {
                stmt.run([pedidoId, item.id, item.preco, item.quantidade]);
            });
            stmt.finalize();
            // Retorna o sucesso apenas após processar a lista do lote
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

app.listen(3000, () => console.log("Loja Maromba rodando na porta 3000!"));
