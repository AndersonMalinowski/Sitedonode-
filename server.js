const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const PORT = 3000;

// Configurações nativas do ecossistema Node.js / Express
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// 👥 Banco de dados temporário de Clientes Registrados
const clientes = [
    { nome: "Carlos Henrique", email: "carlos@email.com" },
    { nome: "Mariana Costa", email: "mari@email.com" }
];

// 🛒 Banco de dados temporário de Agendamentos de Compras (com quantidade)
const agendamentos = [
    { clienteEmail: "carlos@email.com", produto: "Whey Protein Concentrado 1kg", quantidade: 2, total: "299.80", dataRetirada: "15/06/2026" }
];

// 💊 Loja de Suplementos e 🏋️‍♂️ Equipamentos de uso da Academia
const produtos = [
    { id: 1, nome: "Whey Protein Concentrado 1kg", preco: 149.90, tipo: "Suplemento" },
    { id: 2, nome: "Creatina Monohidratada 300g", preco: 89.90, tipo: "Suplemento" },
    { id: 3, nome: "BCAA Powder 200g", preco: 65.00, tipo: "Suplemento" },
    { id: 4, nome: "Halter Emborrachado Profissional 12kg", preco: 135.00, tipo: "Equipamento de Uso" },
    { id: 5, nome: "Banco Regulável Reto/Inclinado", preco: 640.00, tipo: "Equipamento de Uso" },
    { id: 6, nome: "Corda de Pular de Alta Velocidade", preco: 45.00, tipo: "Equipamento de Uso" }
];

// 📋 Serviços Disponíveis na Academia
const servicos = [
    { nome: "Plano Mensal Livre (Musculação)", preco: "R$ 99,90/mês" },
    { nome: "Consultoria Personalizada com Personal Trainer", preco: "R$ 160,00/mês" },
    { nome: "Avaliação por Bioimpedância Computadorizada", preco: "R$ 60,00/sessão" },
    { nome: "Aulas de Crossfit e Funcional em Grupo", preco: "R$ 120,00/mês" }
];

// 🟢 ROTA PRINCIPAL: Renderiza o site completo com todas as seções unificadas
app.get('/', (req, res) => {
    res.render('index', { 
        produtos, 
        servicos, 
        clientes, 
        agendamentos,
        sucesso: null,
        erro: null
    });
});

// 🔵 ROTA DE POST: Cadastro de Novos Clientes
app.post('/cadastro', (req, res) => {
    const { nome, email } = req.body;
    
    if (!nome || !email) {
        return res.render('index', { produtos, servicos, clientes, agendamentos, sucesso: null, erro: "Preencha todos os campos do cadastro!" });
    }

    const emailExiste = clientes.find(c => c.email.toLowerCase() === email.toLowerCase());
    if (emailExiste) {
        return res.render('index', { produtos, servicos, clientes, agendamentos, sucesso: null, erro: "Este e-mail de cliente já está registrado!" });
    }

    clientes.push({ nome, email: email.toLowerCase() });
    res.render('index', { produtos, servicos, clientes, agendamentos, sucesso: "Cliente registrado com sucesso!", erro: null });
});

// 🟠 ROTA DE POST: Agendamento de Quantidade de Compra
app.post('/agendamento', (req, res) => {
    const { clienteEmail, produtoId, quantidade, dataRetirada } = req.body;
    
    // Validar se o cliente está cadastrado no sistema do Node
    const clienteEncontrado = clientes.find(c => c.email.toLowerCase() === clienteEmail.toLowerCase());
    if (!clienteEncontrado) {
        return res.render('index', { produtos, servicos, clientes, agendamentos, sucesso: null, erro: "E-mail não encontrado! Registre o cliente no formulário ao lado antes de agendar." });
    }

    // Validar produto selecionado
    const produtoEncontrado = produtos.find(p => Number(p.id) === Number(produtoId));
    if (!produtoEncontrado) {
        return res.render('index', { produtos, servicos, clientes, agendamentos,... { sucesso: null, erro: "Produto inválido!" } });
    }

    const qtd = parseInt(quantidade) || 1;
    const totalCalculado = (produtoEncontrado.preco * qtd).toFixed(2);

    // Formatar data vinda do HTML para formato brasileiro (DD/MM/AAAA)
    let dataFormatada = dataRetirada;
    if (dataRetirada) {
        const partes = dataRetirada.split('-');
        if (partes.length === 3) dataFormatada = `${partes[2]}/${partes[1]}/${partes[0]}`;
    }

    // Salvar o agendamento no array do Node
    agendamentos.push({
        clienteEmail: clienteEmail.toLowerCase(),
        produto: produtoEncontrado.nome,
        quantidade: qtd,
        total: totalCalculado,
        dataRetirada: dataFormatada
    });

    res.render('index', { produtos, servicos, clientes, agendamentos, sucesso: `Agendamento de ${qtd}x ${produtoEncontrado.nome} salvo com sucesso!`, erro: null });
});

// Inicia o servidor Node.js
app.listen(PORT, () => {
    console.log(`🚀 Site rodando perfeitamente em http://localhost:${PORT}`);
});
