import { useState, useEffect } from 'react';
import { Dumbbell, Plus, Check, AlertCircle } from 'lucide-react';
import { apiUrl } from '../lib/api';

export default function Setup({ onComplete }) {
  const [step, setStep] = useState(1); // 1: criar plano, 2: criar aluno
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [planoForm, setPlanoForm] = useState({
    nome: 'Mensal',
    duracao: 1,
    valor: '99.90',
    descricao: 'Plano mensal',
  });
  
  const [alunoForm, setAlunoForm] = useState({
    nome: '',
    cpf: '',
    whatsapp: '',
    dataNascimento: '',
    dataVencimento: '',
    planoId: null,
  });

  const [planoId, setPlanoId] = useState(null);
  const [planoErrors, setPlanoErrors] = useState({});
  const [alunoErrors, setAlunoErrors] = useState({});

  const validatePlano = () => {
    const errs = {};
    if (!planoForm.nome.trim()) errs.nome = 'Nome do plano é obrigatório';
    if (!planoForm.valor || isNaN(planoForm.valor) || Number(planoForm.valor) <= 0) errs.valor = 'Valor inválido';
    setPlanoErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateAluno = () => {
    const errs = {};
    if (!alunoForm.nome.trim()) errs.nome = 'Nome é obrigatório';
    if (!alunoForm.cpf.trim()) errs.cpf = 'CPF é obrigatório';
    if (!alunoForm.whatsapp.trim()) errs.whatsapp = 'WhatsApp é obrigatório';
    if (!alunoForm.dataNascimento) errs.dataNascimento = 'Data de nascimento é obrigatória';
    if (!alunoForm.dataVencimento) errs.dataVencimento = 'Data de vencimento é obrigatória';
    setAlunoErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCriarPlano = async (e) => {
    e.preventDefault();
    if (!validatePlano()) return;

    setLoading(true);
    setError('');
    try {
      const res = await fetch(apiUrl('/api/planos'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: planoForm.nome,
          duracao: Number(planoForm.duracao),
          valor: Number(planoForm.valor),
          descricao: planoForm.descricao,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const created = await res.json();
      setPlanoId(created.id);
      setAlunoForm(prev => ({ ...prev, planoId: created.id }));
      setStep(2);
    } catch (err) {
      console.error('Erro ao criar plano:', err);
      setError('Não foi possível criar o plano. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCriarAluno = async (e) => {
    e.preventDefault();
    if (!validateAluno()) return;

    setLoading(true);
    setError('');
    try {
      const res = await fetch(apiUrl('/api/alunos'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: alunoForm.nome,
          cpf: alunoForm.cpf,
          whatsapp: alunoForm.whatsapp,
          dataNascimento: alunoForm.dataNascimento,
          dataVencimento: alunoForm.dataVencimento,
          planoId: planoId,
          status: 'ativo',
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      onComplete();
    } catch (err) {
      console.error('Erro ao criar aluno:', err);
      setError('Não foi possível criar o aluno. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Cabeçalho */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center shadow-lg">
            <Dumbbell size={32} color="white" />
          </div>
          <h1 className="mt-6 text-3xl font-bold text-white">Bem-vindo!</h1>
          <p className="mt-2 text-sm text-gray-400">
            {step === 1 
              ? 'Vamos começar criando seu primeiro plano'
              : 'Agora cadastre seu primeiro aluno'}
          </p>
        </div>

        {/* Indicador de progresso */}
        <div className="flex items-center justify-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
            1
          </div>
          <div className={`flex-1 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-700'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
            2
          </div>
        </div>

        {/* Mensagem de erro */}
        {error && (
          <div className="p-4 rounded-lg bg-red-900/20 border border-red-700/50 flex items-start gap-3">
            <AlertCircle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Step 1: Criar Plano */}
        {step === 1 && (
          <form onSubmit={handleCriarPlano} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Nome do Plano *</label>
              <input
                type="text"
                placeholder="Ex: Mensal, Trimestral..."
                value={planoForm.nome}
                onChange={e => {
                  setPlanoForm(prev => ({ ...prev, nome: e.target.value }));
                  if (planoErrors.nome) setPlanoErrors(prev => ({ ...prev, nome: '' }));
                }}
                className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {planoErrors.nome && <p className="text-xs text-red-400 mt-1">{planoErrors.nome}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Duração (meses) *</label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={planoForm.duracao}
                  onChange={e => setPlanoForm(prev => ({ ...prev, duracao: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Valor (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={planoForm.valor}
                  onChange={e => {
                    setPlanoForm(prev => ({ ...prev, valor: e.target.value }));
                    if (planoErrors.valor) setPlanoErrors(prev => ({ ...prev, valor: '' }));
                  }}
                  className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {planoErrors.valor && <p className="text-xs text-red-400 mt-1">{planoErrors.valor}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Descrição</label>
              <input
                type="text"
                placeholder="Descrição do plano..."
                value={planoForm.descricao}
                onChange={e => setPlanoForm(prev => ({ ...prev, descricao: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Criando...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Criar Plano
                </>
              )}
            </button>
          </form>
        )}

        {/* Step 2: Criar Aluno */}
        {step === 2 && (
          <form onSubmit={handleCriarAluno} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Nome Completo *</label>
              <input
                type="text"
                placeholder="Ex: João da Silva"
                value={alunoForm.nome}
                onChange={e => {
                  setAlunoForm(prev => ({ ...prev, nome: e.target.value }));
                  if (alunoErrors.nome) setAlunoErrors(prev => ({ ...prev, nome: '' }));
                }}
                className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {alunoErrors.nome && <p className="text-xs text-red-400 mt-1">{alunoErrors.nome}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">CPF *</label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={alunoForm.cpf}
                  onChange={e => {
                    setAlunoForm(prev => ({ ...prev, cpf: e.target.value }));
                    if (alunoErrors.cpf) setAlunoErrors(prev => ({ ...prev, cpf: '' }));
                  }}
                  maxLength={14}
                  className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {alunoErrors.cpf && <p className="text-xs text-red-400 mt-1">{alunoErrors.cpf}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">WhatsApp *</label>
                <input
                  type="text"
                  placeholder="(11) 99999-9999"
                  value={alunoForm.whatsapp}
                  onChange={e => {
                    setAlunoForm(prev => ({ ...prev, whatsapp: e.target.value }));
                    if (alunoErrors.whatsapp) setAlunoErrors(prev => ({ ...prev, whatsapp: '' }));
                  }}
                  className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {alunoErrors.whatsapp && <p className="text-xs text-red-400 mt-1">{alunoErrors.whatsapp}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Data de Nascimento *</label>
                <input
                  type="date"
                  value={alunoForm.dataNascimento}
                  onChange={e => {
                    setAlunoForm(prev => ({ ...prev, dataNascimento: e.target.value }));
                    if (alunoErrors.dataNascimento) setAlunoErrors(prev => ({ ...prev, dataNascimento: '' }));
                  }}
                  style={{ colorScheme: 'dark' }}
                  className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {alunoErrors.dataNascimento && <p className="text-xs text-red-400 mt-1">{alunoErrors.dataNascimento}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Data de Vencimento *</label>
                <input
                  type="date"
                  value={alunoForm.dataVencimento}
                  onChange={e => {
                    setAlunoForm(prev => ({ ...prev, dataVencimento: e.target.value }));
                    if (alunoErrors.dataVencimento) setAlunoErrors(prev => ({ ...prev, dataVencimento: '' }));
                  }}
                  style={{ colorScheme: 'dark' }}
                  className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {alunoErrors.dataVencimento && <p className="text-xs text-red-400 mt-1">{alunoErrors.dataVencimento}</p>}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={loading}
                className="flex-1 py-2 px-4 border border-gray-600 text-gray-300 font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Começar
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Rodapé */}
        <div className="text-center text-xs text-gray-500">
          <p>Você pode adicionar mais planos e alunos depois no sistema</p>
        </div>
      </div>
    </div>
  );
}
