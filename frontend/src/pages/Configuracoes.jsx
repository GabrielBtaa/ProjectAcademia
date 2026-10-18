import {
  Settings as SettingsIcon,
  Bell,
  Globe,
  Shield,
  Palette,
  ChevronRight,
  Save,
  Lock,
  CheckCircle2,
  CreditCard,
  AlertTriangle,
  Gift,
  Copy,
  Share2,
  Download,
  Trash2,
  KeyRound,
  Sparkles,
  X,
} from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme, ACENTOS } from '../contexts/ThemeContext';
import { apiFetch } from '../lib/api';
import ConexaoWhatsapp from '../components/ConexaoWhatsapp';

// Item de configuração genérico
function SettingItem({ icon: Icon, title, description, children }) {
  return (
    <div
      className="flex items-start justify-between py-4"
      style={{ borderBottom: '1px solid var(--border-1)' }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: 'color-mix(in srgb, var(--accent) 10%, transparent)' }}
        >
          <Icon size={17} style={{ color: 'var(--accent-400)' }} />
        </div>
        <div>
          <p className="text-sm font-semibold text-heading">{title}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</p>
        </div>
      </div>
      <div className="ml-4 flex-shrink-0">{children}</div>
    </div>
  );
}

// Toggle switch estilizado
function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
      style={{ background: checked ? 'var(--accent)' : 'var(--border-4)' }}
    >
      <span
        className="inline-block w-4 h-4 transform rounded-full bg-white transition-transform shadow-sm"
        style={{ transform: checked ? 'translateX(24px)' : 'translateX(4px)' }}
      />
    </button>
  );
}

const VARIAVEIS_MENSAGEM = [
  { token: '{NOME_ALUNO}', label: 'Nome do aluno' },
  { token: '{NOME_ACADEMIA}', label: 'Nome da academia' },
  { token: '{DATA_VENCIMENTO}', label: 'Data de vencimento' },
  { token: '{CHAVE_PIX}', label: 'Chave PIX' },
];

/**
 * Fileira de botões que insere a variável clicada na posição do cursor
 * dentro do textarea indicado por textareaRef, sem precisar digitar chaves.
 */
function VariaveisMensagem({ textareaRef, value, onChange }) {
  const inserirVariavel = (token) => {
    const el = textareaRef.current;
    if (!el) {
      onChange((value || '') + token);
      return;
    }
    const inicio = el.selectionStart ?? value.length;
    const fim = el.selectionEnd ?? value.length;
    const novoValor = (value || '').slice(0, inicio) + token + (value || '').slice(fim);
    onChange(novoValor);
    // Devolve o foco e posiciona o cursor logo depois da variável inserida
    requestAnimationFrame(() => {
      el.focus();
      const novaPos = inicio + token.length;
      el.setSelectionRange(novaPos, novaPos);
    });
  };

  return (
    <div className="flex flex-wrap gap-1.5 mb-2">
      {VARIAVEIS_MENSAGEM.map(v => (
        <button
          key={v.token}
          type="button"
          onClick={() => inserirVariavel(v.token)}
          className="text-[0.68rem] px-2 py-1 rounded-md font-medium transition-colors"
          style={{ background: 'var(--surface-alt-2)', color: 'var(--text-secondary)', border: '1px solid var(--border-2)' }}
          title={`Inserir ${v.label}`}
        >
          + {v.label}
        </button>
      ))}
    </div>
  );
}

const NOMES_PLANO = { starter: 'Starter (até 150 alunos)', pro: 'Pro (até 250 alunos)', business: 'Business (até 350 alunos)' };

function dadosAcademiaVazios() {
  return { nomeAcademia: '', cnpj: '', telefone: '', endereco: '', chavePix: '', emailAutoEnviar: false };
}

/**
 * Página de Configurações
 * Tela básica de configurações do sistema.
 */
export default function Configuracoes() {
  const { theme, toggleTheme, accent, setAccent } = useTheme();
  const [config, setConfig] = useState({
  });
  const [dadosAcademia, setDadosAcademia] = useState(dadosAcademiaVazios);
  const msg5DiasRef = useRef(null);
  const msgVencidoRef = useRef(null);
  const [salvandoAcademia, setSalvandoAcademia] = useState(false);
  const [academiaSalva, setAcademiaSalva] = useState(false);
  const [erroSalvarAcademia, setErroSalvarAcademia] = useState(null);
  const [mostrarWowAutomacao, setMostrarWowAutomacao] = useState(false);
  const [whatsappConectado, setWhatsappConectado] = useState(false);

  // Carrega os dados da academia da conta logada (não é mais por navegador)
  useEffect(() => {
    apiFetch('/api/conta/academia')
      .then(res => res.json())
      .then(data => setDadosAcademia({
        nomeAcademia: data.nomeAcademia || '',
        cnpj: data.cnpjAcademia || '',
        telefone: data.telefoneAcademia || '',
        endereco: data.enderecoAcademia || '',
        chavePix: data.chavePix || '',
        whatsappMsg5Dias: data.whatsappMsg5Dias || '',
        whatsappMsgVencido: data.whatsappMsgVencido || '',
        whatsappAutoEnviar: !!data.whatsappAutoEnviar,
        whatsappHoraEnvio: typeof data.whatsappHoraEnvio === 'number' ? data.whatsappHoraEnvio : 9,
        whatsappDiasMaxAtraso: typeof data.whatsappDiasMaxAtraso === 'number' ? data.whatsappDiasMaxAtraso : 5,
        emailAutoEnviar: !!data.emailAutoEnviar,
        temPinAdmin: !!data.temPinAdmin,
      }))
      .catch(() => {});
  }, []);

  const [senhaForm, setSenhaForm] = useState({ senhaAtual: '', novaSenha: '', confirmarSenha: '' });
  const [senhaLoading, setSenhaLoading] = useState(false);
  const [senhaErro, setSenhaErro] = useState(null);
  const [senhaSucesso, setSenhaSucesso] = useState(false);

  // ===== Indicação =====
  const [indicacao, setIndicacao] = useState(null);
  const [linkCopiado, setLinkCopiado] = useState(false);
  useEffect(() => {
    apiFetch('/api/indicacao').then(r => r.json()).then(d => { if (d.codigo) setIndicacao(d); }).catch(() => {});
  }, []);
  const linkIndicacao = indicacao ? `${window.location.origin}/?ref=${indicacao.codigo}` : '';
  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(linkIndicacao);
      setLinkCopiado(true);
      setTimeout(() => setLinkCopiado(false), 2000);
    } catch { window.prompt('Copie o link:', linkIndicacao); }
  };

  // ===== Senha do modo administrador (PIN) =====
  const [pinForm, setPinForm] = useState({ senha: '', pin: '' });
  const [pinMsg, setPinMsg] = useState(null); // { tipo: 'ok' | 'erro', texto }
  const [salvandoPin, setSalvandoPin] = useState(false);

  const salvarPin = async (remover = false) => {
    setSalvandoPin(true);
    setPinMsg(null);
    try {
      const res = await apiFetch('/api/conta/pin-admin', {
        method: 'PUT',
        body: JSON.stringify({ senha: pinForm.senha, pin: remover ? null : pinForm.pin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar a senha');
      setDadosAcademia(prev => ({ ...prev, temPinAdmin: data.temPinAdmin }));
      setPinForm({ senha: '', pin: '' });
      setPinMsg({ tipo: 'ok', texto: data.temPinAdmin ? 'Senha do modo administrador salva!' : 'Senha removida: voltará a valer a senha da sua conta.' });
    } catch (e) {
      setPinMsg({ tipo: 'erro', texto: e.message });
    } finally {
      setSalvandoPin(false);
    }
  };

  // ===== Privacidade: exportar e excluir conta (LGPD) =====
  const [mostrarExcluirConta, setMostrarExcluirConta] = useState(false);
  const [senhaExcluir, setSenhaExcluir] = useState('');
  const [confirmacaoExcluir, setConfirmacaoExcluir] = useState('');
  const [processandoPrivacidade, setProcessandoPrivacidade] = useState(false);
  const [erroPrivacidade, setErroPrivacidade] = useState(null);

  const handleExportarDados = async () => {
    setProcessandoPrivacidade(true);
    setErroPrivacidade(null);
    try {
      const res = await apiFetch('/api/conta/exportar');
      if (!res.ok) throw new Error('Erro ao exportar seus dados');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'meus-dados-gymflow.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErroPrivacidade(e.message);
    } finally {
      setProcessandoPrivacidade(false);
    }
  };

  const handleExcluirConta = async () => {
    setProcessandoPrivacidade(true);
    setErroPrivacidade(null);
    try {
      const res = await apiFetch('/api/conta', {
        method: 'DELETE',
        body: JSON.stringify({ senha: senhaExcluir, confirmacao: confirmacaoExcluir }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir a conta');
      localStorage.removeItem('token');
      window.location.href = '/';
    } catch (e) {
      setErroPrivacidade(e.message);
      setProcessandoPrivacidade(false);
    }
  };

  // ===== Assinatura =====
  const [billingStatus, setBillingStatus] = useState(null);
  const [mostrarConfirmCancelar, setMostrarConfirmCancelar] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [processandoAssinatura, setProcessandoAssinatura] = useState(false);
  const [erroAssinatura, setErroAssinatura] = useState(null);

  useEffect(() => {
    apiFetch('/api/billing/status')
      .then(res => res.json())
      .then(data => setBillingStatus(data))
      .catch(() => {});
  }, []);

  const handleCancelarAssinatura = async () => {
    setProcessandoAssinatura(true);
    setErroAssinatura(null);
    try {
      const res = await apiFetch('/api/billing/cancelar', {
        method: 'POST',
        body: JSON.stringify({ motivo: motivoCancelamento || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Erro ao cancelar assinatura');
      setBillingStatus(prev => ({ ...prev, cancelamentoAgendado: true, assinaturaRenovaEm: data.assinaturaRenovaEm }));
      setMostrarConfirmCancelar(false);
      setMotivoCancelamento('');
    } catch (e) {
      setErroAssinatura(e.message);
    } finally {
      setProcessandoAssinatura(false);
    }
  };

  const handleReativarAssinatura = async () => {
    setProcessandoAssinatura(true);
    setErroAssinatura(null);
    try {
      const res = await apiFetch('/api/billing/reativar', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Erro ao reativar assinatura');
      setBillingStatus(prev => ({ ...prev, cancelamentoAgendado: false }));
    } catch (e) {
      setErroAssinatura(e.message);
    } finally {
      setProcessandoAssinatura(false);
    }
  };

  const toggle = (key) => setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  const updateAcademia = (key, value) => setDadosAcademia(prev => ({ ...prev, [key]: value }));

  const handleSalvarAcademia = async (overrides = {}) => {
    // Proteção: se essa função for usada direto num onClick sem wrapper, o React
    // passa o SyntheticEvent do clique como argumento — nesse caso ignoramos.
    const overridesValidos = (overrides && typeof overrides === 'object' && !('nativeEvent' in overrides))
      ? overrides
      : {};

    setSalvandoAcademia(true);
    setErroSalvarAcademia(null);
    try {
      const res = await apiFetch('/api/conta/academia', {
        method: 'PUT',
        body: JSON.stringify({
          nomeAcademia: dadosAcademia.nomeAcademia,
          cnpjAcademia: dadosAcademia.cnpj,
          telefoneAcademia: dadosAcademia.telefone,
          enderecoAcademia: dadosAcademia.endereco,
          chavePix: dadosAcademia.chavePix,
          whatsappMsg5Dias: dadosAcademia.whatsappMsg5Dias,
          whatsappMsgVencido: dadosAcademia.whatsappMsgVencido,
          whatsappAutoEnviar: dadosAcademia.whatsappAutoEnviar,
          whatsappHoraEnvio: dadosAcademia.whatsappHoraEnvio,
          whatsappDiasMaxAtraso: dadosAcademia.whatsappDiasMaxAtraso,
          emailAutoEnviar: dadosAcademia.emailAutoEnviar,
          ...overridesValidos,
        }),
      });

      if (!res.ok) {
        const corpoErro = await res.json().catch(() => ({}));
        throw new Error(corpoErro.error || 'Erro ao salvar dados da academia');
      }

      const dataResposta = await res.json().catch(() => ({}));
      window.dispatchEvent(new CustomEvent('gymflow:settings-updated'));
      setAcademiaSalva(true);
      if (dataResposta.automacaoConfiguradaAgora) setMostrarWowAutomacao(true);
      setTimeout(() => setAcademiaSalva(false), 2500);
    } catch (e) {
      setErroSalvarAcademia(e.message || 'Erro ao salvar. Tente novamente.');
    } finally {
      setSalvandoAcademia(false);
    }
  };

  const handleToggleEmailAutoEnviar = () => {
    const novoValor = !dadosAcademia.emailAutoEnviar;
    updateAcademia('emailAutoEnviar', novoValor);
    handleSalvarAcademia({ emailAutoEnviar: novoValor });
  };

  // Quando o WhatsApp é desconectado, o servidor já desligou o envio automático: reflete na tela
  const handleEstadoWhatsapp = useCallback((conectado) => {
    setWhatsappConectado(conectado);
    if (!conectado) setDadosAcademia(prev => (prev.whatsappAutoEnviar ? { ...prev, whatsappAutoEnviar: false } : prev));
  }, []);

  const handleToggleAutoEnviar = () => {
    const novoValor = !dadosAcademia.whatsappAutoEnviar;
    if (novoValor && !whatsappConectado) {
      window.alert('Conecte o WhatsApp da sua academia primeiro (botão "Conectar WhatsApp", na seção de mensagens).');
      return;
    }
    updateAcademia('whatsappAutoEnviar', novoValor);
    handleSalvarAcademia({ whatsappAutoEnviar: novoValor });
  };

  const handleChangeDiasMaxAtraso = (e) => {
    const dias = Number(e.target.value);
    updateAcademia('whatsappDiasMaxAtraso', dias);
    handleSalvarAcademia({ whatsappDiasMaxAtraso: dias });
  };

  const handleChangeHoraEnvio = (e) => {
    const novaHora = Number(e.target.value);
    updateAcademia('whatsappHoraEnvio', novaHora);
    handleSalvarAcademia({ whatsappHoraEnvio: novaHora });
  };

  const handleAlterarSenha = async (e) => {
    e.preventDefault();
    setSenhaErro(null);
    setSenhaSucesso(false);

    if (senhaForm.novaSenha !== senhaForm.confirmarSenha) {
      setSenhaErro('A confirmação não confere com a nova senha');
      return;
    }
    if (senhaForm.novaSenha.length < 6) {
      setSenhaErro('A nova senha deve ter ao menos 6 caracteres');
      return;
    }

    setSenhaLoading(true);
    try {
      const res = await apiFetch('/api/auth/senha', {
        method: 'PUT',
        body: JSON.stringify({
          senhaAtual: senhaForm.senhaAtual,
          novaSenha: senhaForm.novaSenha,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Erro ao alterar senha');

      if (data.token) localStorage.setItem('token', data.token); // as outras sessões foram encerradas; esta continua
      setSenhaSucesso(true);
      setSenhaForm({ senhaAtual: '', novaSenha: '', confirmarSenha: '' });
      setTimeout(() => setSenhaSucesso(false), 2500);
    } catch (err) {
      setSenhaErro(err.message || 'Erro ao alterar senha');
    } finally {
      setSenhaLoading(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 page-enter">
      {mostrarWowAutomacao && (
        <div
          className="rounded-xl p-4 flex items-start gap-3 animate-[fadeIn_0.3s_ease]"
          style={{ background: 'color-mix(in srgb, var(--accent-500) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-500) 30%, transparent)' }}
        >
          <Sparkles size={20} className="flex-shrink-0 mt-0.5 text-blue-400" />
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: 'var(--text-heading)' }}>Automação ativada! 🎉</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              A partir de agora o GymFlow vai lembrar e cobrar seus alunos inadimplentes sozinho, sem você precisar mandar mensagem manual. É só configurar o horário de envio se quiser ajustar.
            </p>
          </div>
          <button onClick={() => setMostrarWowAutomacao(false)} className="flex-shrink-0 p-1" style={{ color: 'var(--text-muted)' }} aria-label="Fechar">
            <X size={16} />
          </button>
        </div>
      )}
      <div>
        <h3 className="text-xl font-bold text-heading">Configurações</h3>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Gerencie as preferências do seu sistema</p>
      </div>

      {/* Dados da Academia */}
      <div className="rounded-xl p-5" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-2)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Globe size={17} style={{ color: 'var(--accent-400)' }} />
          <h4 className="font-semibold text-heading text-sm">Dados da Academia</h4>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nome da Academia</label>
            <input className="input-field" value={dadosAcademia.nomeAcademia} onChange={e => updateAcademia('nomeAcademia', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>CNPJ</label>
              <input className="input-field" value={dadosAcademia.cnpj} onChange={e => updateAcademia('cnpj', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Telefone</label>
              <input className="input-field" value={dadosAcademia.telefone} onChange={e => updateAcademia('telefone', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Endereço</label>
            <input className="input-field" value={dadosAcademia.endereco} onChange={e => updateAcademia('endereco', e.target.value)} />
          </div>
          <button className="btn-primary mt-2" onClick={() => handleSalvarAcademia()} disabled={salvandoAcademia}>
            {academiaSalva ? <CheckCircle2 size={14} /> : <Save size={14} />}
            {salvandoAcademia ? 'Salvando...' : academiaSalva ? 'Salvo!' : 'Salvar Dados'}
          </button>
          {erroSalvarAcademia && (
            <p className="text-xs" style={{ color: '#f87171' }}>{erroSalvarAcademia}</p>
          )}
        </div>
      </div>

      {/* Automação de WhatsApp & Chave PIX */}
      <div className="rounded-xl p-5" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-2)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <span className="text-base">📱</span>
            </div>
            <div>
              <h4 className="font-semibold text-heading text-sm">Automação de WhatsApp & Chave PIX</h4>
              <p className="text-xs text-muted">Disparos automáticos de 5 dias antes e cobrança sem intervenção manual</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[0.65rem] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            🤖 Robô Mãos-Livres
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Chave PIX da Academia (CPF, CNPJ, Email ou Telefone)
            </label>
            <input
              className="input-field"
              placeholder="Ex: 12.345.678/0001-90 ou financeiro@suaacademia.com"
              value={dadosAcademia.chavePix || ''}
              onChange={e => updateAcademia('chavePix', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Mensagem — 5 dias antes de vencer
            </label>
            <VariaveisMensagem
              textareaRef={msg5DiasRef}
              value={dadosAcademia.whatsappMsg5Dias || ''}
              onChange={v => updateAcademia('whatsappMsg5Dias', v)}
            />
            <textarea
              ref={msg5DiasRef}
              className="input-field"
              rows={3}
              placeholder="Olá, {NOME_ALUNO}! Sua mensalidade na {NOME_ACADEMIA} vence em 5 dias (dia {DATA_VENCIMENTO}). Chave PIX: {CHAVE_PIX}."
              value={dadosAcademia.whatsappMsg5Dias || ''}
              onChange={e => updateAcademia('whatsappMsg5Dias', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Mensagem — mensalidade vencida
            </label>
            <VariaveisMensagem
              textareaRef={msgVencidoRef}
              value={dadosAcademia.whatsappMsgVencido || ''}
              onChange={v => updateAcademia('whatsappMsgVencido', v)}
            />
            <textarea
              ref={msgVencidoRef}
              className="input-field"
              rows={3}
              placeholder="Olá, {NOME_ALUNO}! Sua mensalidade na {NOME_ACADEMIA} venceu em {DATA_VENCIMENTO}. Chave PIX: {CHAVE_PIX}."
              value={dadosAcademia.whatsappMsgVencido || ''}
              onChange={e => updateAcademia('whatsappMsgVencido', e.target.value)}
            />
          </div>
          <p className="text-[0.7rem]" style={{ color: 'var(--text-muted)' }}>
            Clique nos botões acima do campo pra inserir a variável na posição do cursor. Deixe em branco pra usar a mensagem padrão.
          </p>

          <div className="flex items-center gap-3">
            <button
              className="btn-primary flex items-center gap-2"
              onClick={() => handleSalvarAcademia()}
              disabled={salvandoAcademia}
            >
              {academiaSalva ? <CheckCircle2 size={14} /> : <Save size={14} />}
              {salvandoAcademia ? 'Salvando...' : academiaSalva ? 'Salvo!' : 'Salvar Mensagens e PIX'}
            </button>
          </div>

          <ConexaoWhatsapp onEstado={handleEstadoWhatsapp} />

          <div className="p-3 rounded-lg space-y-3" style={{ background: 'var(--surface-alt-1)', border: '1px solid var(--border-2)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold" style={{ color: 'var(--text-heading)' }}>Envio Automático Diário</p>
                <p className="text-[0.7rem]" style={{ color: 'var(--text-muted)' }}>
                  O servidor enviará os lembretes de 5 dias antes e cobranças de vencido automaticamente às{' '}
                  {String(dadosAcademia.whatsappHoraEnvio ?? 9).padStart(2, '0')}:00 (horário de Brasília)
                </p>
              </div>
              <Toggle checked={!!dadosAcademia.whatsappAutoEnviar} onChange={handleToggleAutoEnviar} />
            </div>

            <div className="flex items-center gap-2 flex-wrap pt-1" style={{ borderTop: '1px solid var(--border-2)' }}>
              <label htmlFor="diasMaxAtraso" className="text-[0.7rem]" style={{ color: 'var(--text-muted)' }}>
                Parar de cobrar após
              </label>
              <select
                id="diasMaxAtraso"
                value={dadosAcademia.whatsappDiasMaxAtraso ?? 5}
                onChange={handleChangeDiasMaxAtraso}
                className="text-xs rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                style={{ background: 'var(--surface-card)', border: '1px solid var(--border-2)', color: 'var(--text-heading)' }}
              >
                {[1, 2, 3, 4, 5, 6, 7, 10, 15, 30].map(n => (
                  <option key={n} value={n}>{n} dia{n > 1 ? 's' : ''}</option>
                ))}
              </select>
              <span className="text-[0.7rem]" style={{ color: 'var(--text-muted)' }}>de atraso (depois disso o aluno não recebe mais cobrança)</span>
            </div>

            {dadosAcademia.whatsappAutoEnviar && (
              <div className="flex items-center gap-2 pt-1" style={{ borderTop: '1px solid var(--border-2)' }}>
                <label htmlFor="horaEnvio" className="text-[0.7rem]" style={{ color: 'var(--text-muted)' }}>
                  Horário do disparo:
                </label>
                <select
                  id="horaEnvio"
                  value={dadosAcademia.whatsappHoraEnvio ?? 9}
                  onChange={handleChangeHoraEnvio}
                  className="text-xs rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ background: 'var(--surface-card)', border: '1px solid var(--border-2)', color: 'var(--text-heading)' }}
                >
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              className="btn-primary flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={async () => {
                try {
                  const res = await apiFetch('/api/whatsapp/disparar-agora', { method: 'POST' });
                  const json = await res.json();
                  alert(json.mensagem || 'Disparo executado com sucesso!');
                } catch (e) {
                  alert('Erro ao executar robô: ' + e.message);
                }
              }}
            >
              <span>🤖 Testar Robô de Disparo Agora</span>
            </button>
          </div>
        </div>
      </div>

      {/* Alterar Senha */}
      <div className="rounded-xl p-5" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-2)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Lock size={17} style={{ color: 'var(--accent-400)' }} />
          <h4 className="font-semibold text-heading text-sm">Alterar Senha</h4>
        </div>
        <form onSubmit={handleAlterarSenha} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Senha Atual</label>
            <input
              type="password"
              className="input-field"
              value={senhaForm.senhaAtual}
              onChange={e => setSenhaForm(prev => ({ ...prev, senhaAtual: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nova Senha</label>
              <input
                type="password"
                className="input-field"
                value={senhaForm.novaSenha}
                onChange={e => setSenhaForm(prev => ({ ...prev, novaSenha: e.target.value }))}
                minLength={6}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Confirmar Nova Senha</label>
              <input
                type="password"
                className="input-field"
                value={senhaForm.confirmarSenha}
                onChange={e => setSenhaForm(prev => ({ ...prev, confirmarSenha: e.target.value }))}
                minLength={6}
                required
              />
            </div>
          </div>
          {senhaErro && <p className="text-xs" style={{ color: '#f87171' }}>{senhaErro}</p>}
          <button type="submit" className="btn-primary mt-2" disabled={senhaLoading}>
            {senhaSucesso ? <CheckCircle2 size={14} /> : <Lock size={14} />}
            {senhaLoading ? 'Alterando...' : senhaSucesso ? 'Senha alterada!' : 'Alterar Senha'}
          </button>
        </form>
      </div>

      {/* Notificações */}
      <div className="rounded-xl px-5 py-2" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-2)' }}>
        <div className="flex items-center gap-2 py-3" style={{ borderBottom: '1px solid var(--border-1)' }}>
          <Bell size={17} style={{ color: 'var(--accent-400)' }} />
          <h4 className="font-semibold text-heading text-sm">Notificações</h4>
        </div>
        <SettingItem icon={Bell} title="Notificações por E-mail" description="Receba alertas de vencimentos por e-mail">
          <Toggle checked={!!dadosAcademia.emailAutoEnviar} onChange={handleToggleEmailAutoEnviar} />
        </SettingItem>
        <SettingItem icon={Bell} title="Notificações por WhatsApp" description="Envio automático para alunos inadimplentes (mesma automação configurada acima)">
          <Toggle checked={!!dadosAcademia.whatsappAutoEnviar} onChange={handleToggleAutoEnviar} />
        </SettingItem>
        <SettingItem icon={Bell} title="Alerta de Vencimentos" description="Notificar 5 dias antes do vencimento, igual à automação">
          <Toggle checked={!!dadosAcademia.whatsappAutoEnviar} onChange={handleToggleAutoEnviar} />
        </SettingItem>
      </div>

      {/* Indique e ganhe */}
      {indicacao && (
        <div className="rounded-xl px-5 py-2" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-2)' }}>
          <div className="flex items-center gap-2 py-3" style={{ borderBottom: '1px solid var(--border-1)' }}>
            <Gift size={17} style={{ color: '#a78bfa' }} />
            <h4 className="font-semibold text-heading text-sm">Indique e ganhe 1 mês grátis</h4>
          </div>
          <div className="py-4 space-y-3">
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Quando uma academia criar conta pelo seu link e assinar um plano pago, você ganha um mês grátis (crédito no valor do seu plano, abatido na próxima fatura).
            </p>
            <div className="flex gap-2">
              <input readOnly value={linkIndicacao} onFocus={e => e.target.select()}
                className="flex-1 min-w-0 rounded-lg px-3 py-2 text-xs"
                style={{ background: 'var(--surface-alt-1)', border: '1px solid var(--border-2)', color: 'var(--text-heading)' }} />
              <button onClick={copiarLink} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg flex-shrink-0"
                style={{ background: 'color-mix(in srgb, var(--accent-500) 12%, transparent)', color: 'var(--accent-400)', border: '1px solid color-mix(in srgb, var(--accent-500) 30%, transparent)' }}>
                <Copy size={13} /> {linkCopiado ? 'Copiado!' : 'Copiar'}
              </button>
              <a href={`https://wa.me/?text=${encodeURIComponent('Conheça o GymFlow, sistema de gestão para academias, com 30 dias grátis: ' + linkIndicacao)}`}
                target="_blank" rel="noreferrer" aria-label="Compartilhar no WhatsApp"
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg flex-shrink-0"
                style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>
                <Share2 size={13} /> <span className="hidden sm:inline">WhatsApp</span>
              </a>
            </div>
            <div className="flex gap-6 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span><strong style={{ color: 'var(--text-heading)' }}>{indicacao.totalIndicados}</strong> cadastro(s) pelo seu link</span>
              <span><strong style={{ color: 'var(--text-heading)' }}>{indicacao.convertidos}</strong> assinaram</span>
              {indicacao.creditosPendentes > 0 && <span><strong style={{ color: '#a78bfa' }}>{indicacao.creditosPendentes}</strong> mês(es) a receber ao assinar</span>}
            </div>
          </div>
        </div>
      )}

      {/* Assinatura */}
      {billingStatus && !billingStatus.isAdmin && (
        <div className="rounded-xl px-5 py-2" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-2)' }}>
          <div className="flex items-center gap-2 py-3" style={{ borderBottom: '1px solid var(--border-1)' }}>
            <CreditCard size={17} style={{ color: 'var(--accent-400)' }} />
            <h4 className="font-semibold text-heading text-sm">Assinatura</h4>
          </div>

          <div className="py-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
                  Plano {NOMES_PLANO[billingStatus.subscriptionTier] || billingStatus.subscriptionTier || '—'}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {billingStatus.subscriptionStatus === 'trial' && 'Você está no período de teste grátis.'}
                  {billingStatus.acessoLiberadoManual && !billingStatus.temAssinaturaStripe && 'Acesso liberado pelo administrador do GymFlow.'}
                  {billingStatus.subscriptionStatus === 'active' && !billingStatus.cancelamentoAgendado && billingStatus.assinaturaRenovaEm &&
                    `Renova automaticamente em ${new Date(billingStatus.assinaturaRenovaEm).toLocaleDateString('pt-BR')}.`}
                  {billingStatus.subscriptionStatus === 'active' && billingStatus.cancelamentoAgendado && billingStatus.assinaturaRenovaEm &&
                    `Cancelamento agendado — acesso liberado até ${new Date(billingStatus.assinaturaRenovaEm).toLocaleDateString('pt-BR')}.`}
                  {(billingStatus.subscriptionStatus === 'past_due' || billingStatus.subscriptionStatus === 'canceled' || billingStatus.subscriptionStatus === 'inactive') &&
                    'Assinatura inativa.'}
                </p>
              </div>

              {billingStatus.temAssinaturaStripe && billingStatus.subscriptionStatus === 'active' && (
                billingStatus.cancelamentoAgendado ? (
                  <button
                    onClick={handleReativarAssinatura}
                    disabled={processandoAssinatura}
                    className="text-xs font-semibold px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                    style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}
                  >
                    {processandoAssinatura ? 'Aguarde...' : 'Reativar assinatura'}
                  </button>
                ) : (
                  <button
                    onClick={() => setMostrarConfirmCancelar(true)}
                    className="text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                    style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}
                  >
                    Cancelar assinatura
                  </button>
                )
              )}
            </div>

            {mostrarConfirmCancelar && (
              <div className="rounded-lg p-3 space-y-2" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)' }}>
                <p className="text-xs flex items-start gap-2" style={{ color: 'var(--text-secondary)' }}>
                  <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#f87171' }} />
                  Tem certeza? Você continua com acesso total até o fim do período já pago
                  {billingStatus.assinaturaRenovaEm && ` (${new Date(billingStatus.assinaturaRenovaEm).toLocaleDateString('pt-BR')})`}, e depois a conta é bloqueada. Não vamos cobrar de novo.
                </p>
                <div>
                  <label className="text-[0.7rem]" style={{ color: 'var(--text-muted)' }}>Pode nos contar o motivo? (opcional, nos ajuda a melhorar)</label>
                  <textarea
                    value={motivoCancelamento}
                    onChange={e => setMotivoCancelamento(e.target.value)}
                    rows={2}
                    maxLength={500}
                    placeholder="Ex: muito caro, faltou uma função, vou usar outra ferramenta..."
                    className="w-full mt-1 text-xs rounded-lg px-2.5 py-2 resize-none"
                    style={{ background: 'var(--surface-alt-1)', border: '1px solid var(--border-2)', color: 'var(--text-heading)' }}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelarAssinatura}
                    disabled={processandoAssinatura}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50"
                    style={{ background: '#ef4444', color: '#fff' }}
                  >
                    {processandoAssinatura ? 'Cancelando...' : 'Sim, cancelar'}
                  </button>
                  <button
                    onClick={() => setMostrarConfirmCancelar(false)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                    style={{ background: 'var(--surface-alt-1)', color: 'var(--text-secondary)', border: '1px solid var(--border-2)' }}
                  >
                    Voltar
                  </button>
                </div>
              </div>
            )}

            {erroAssinatura && <p className="text-xs" style={{ color: '#f87171' }}>{erroAssinatura}</p>}
          </div>
        </div>
      )}

      {/* Senha do modo administrador */}
      <div className="rounded-xl px-5 py-2" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-2)' }}>
        <div className="flex items-center gap-2 py-3" style={{ borderBottom: '1px solid var(--border-1)' }}>
          <KeyRound size={17} style={{ color: 'var(--accent-400)' }} />
          <h4 className="font-semibold text-heading text-sm">Senha do modo Administrador</h4>
        </div>
        <div className="py-4 space-y-3">
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Quem estiver no <strong>modo Recepcionista</strong> não consegue apagar dados nem acessar Configurações e cobrança. Para voltar ao modo Administrador é preciso digitar esta senha.
            {dadosAcademia.temPinAdmin
              ? ' Você já definiu uma senha; pode trocá-la abaixo.'
              : ' Enquanto você não definir uma, vale a senha da sua conta. Recomendamos criar uma senha curta só para isso (4 a 8 números).'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input type="password" value={pinForm.senha} onChange={e => setPinForm(f => ({ ...f, senha: e.target.value }))}
              placeholder="Senha da sua conta (para autorizar)" autoComplete="current-password"
              className="rounded-lg px-3 py-2 text-xs"
              style={{ background: 'var(--surface-alt-1)', border: '1px solid var(--border-2)', color: 'var(--text-heading)' }} />
            <input type="password" inputMode="numeric" value={pinForm.pin} onChange={e => setPinForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, '').slice(0, 8) }))}
              placeholder="Nova senha do modo admin (4 a 8 números)" autoComplete="off"
              className="rounded-lg px-3 py-2 text-xs"
              style={{ background: 'var(--surface-alt-1)', border: '1px solid var(--border-2)', color: 'var(--text-heading)' }} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => salvarPin(false)} disabled={salvandoPin || !pinForm.senha || pinForm.pin.length < 4}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg disabled:opacity-40"
              style={{ background: 'color-mix(in srgb, var(--accent-500) 14%, transparent)', color: 'var(--accent-400)', border: '1px solid color-mix(in srgb, var(--accent-500) 35%, transparent)' }}>
              <Save size={13} /> {salvandoPin ? 'Salvando...' : 'Salvar senha'}
            </button>
            {dadosAcademia.temPinAdmin && (
              <button onClick={() => salvarPin(true)} disabled={salvandoPin || !pinForm.senha}
                className="text-xs font-semibold px-3 py-2 rounded-lg disabled:opacity-40"
                style={{ background: 'var(--surface-alt-1)', color: 'var(--text-secondary)', border: '1px solid var(--border-2)' }}>
                Remover senha
              </button>
            )}
          </div>
          {pinMsg && <p className="text-xs" style={{ color: pinMsg.tipo === 'ok' ? '#22c55e' : '#f87171' }}>{pinMsg.texto}</p>}
        </div>
      </div>

      {/* Privacidade e dados (LGPD) */}
      <div className="rounded-xl px-5 py-2" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-2)' }}>
        <div className="flex items-center gap-2 py-3" style={{ borderBottom: '1px solid var(--border-1)' }}>
          <Shield size={17} style={{ color: 'var(--accent-400)' }} />
          <h4 className="font-semibold text-heading text-sm">Privacidade e meus dados</h4>
        </div>
        <div className="py-4 space-y-3">
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Você pode baixar uma cópia de todos os dados da sua conta ou excluí-la definitivamente. Veja também a{' '}
            <a href="/privacidade" target="_blank" rel="noreferrer" className="underline text-blue-400">Política de Privacidade</a> e os{' '}
            <a href="/termos" target="_blank" rel="noreferrer" className="underline text-blue-400">Termos de Uso</a>.
          </p>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleExportarDados} disabled={processandoPrivacidade}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg disabled:opacity-50"
              style={{ background: 'color-mix(in srgb, var(--accent-500) 12%, transparent)', color: 'var(--accent-400)', border: '1px solid color-mix(in srgb, var(--accent-500) 30%, transparent)' }}>
              <Download size={13} /> Baixar meus dados
            </button>
            {!mostrarExcluirConta && (
              <button onClick={() => setMostrarExcluirConta(true)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}>
                <Trash2 size={13} /> Excluir minha conta
              </button>
            )}
          </div>

          {mostrarExcluirConta && (
            <div className="rounded-lg p-3 space-y-2" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <p className="text-xs flex items-start gap-2" style={{ color: 'var(--text-secondary)' }}>
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#f87171' }} />
                Isso apaga <strong>definitivamente</strong> sua conta, seus alunos, planos e pagamentos, e cancela sua assinatura imediatamente (sem reembolso do período já pago). Não dá para desfazer.
              </p>
              <input type="password" value={senhaExcluir} onChange={e => setSenhaExcluir(e.target.value)} placeholder="Sua senha"
                className="w-full text-xs rounded-lg px-2.5 py-2"
                style={{ background: 'var(--surface-alt-1)', border: '1px solid var(--border-2)', color: 'var(--text-heading)' }} />
              <input value={confirmacaoExcluir} onChange={e => setConfirmacaoExcluir(e.target.value)} placeholder='Digite EXCLUIR para confirmar'
                className="w-full text-xs rounded-lg px-2.5 py-2"
                style={{ background: 'var(--surface-alt-1)', border: '1px solid var(--border-2)', color: 'var(--text-heading)' }} />
              <div className="flex gap-2">
                <button onClick={handleExcluirConta} disabled={processandoPrivacidade || !senhaExcluir || confirmacaoExcluir !== 'EXCLUIR'}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-40" style={{ background: '#ef4444', color: '#fff' }}>
                  {processandoPrivacidade ? 'Excluindo...' : 'Excluir definitivamente'}
                </button>
                <button onClick={() => { setMostrarExcluirConta(false); setSenhaExcluir(''); setConfirmacaoExcluir(''); setErroPrivacidade(null); }}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                  style={{ background: 'var(--surface-alt-1)', color: 'var(--text-secondary)', border: '1px solid var(--border-2)' }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
          {erroPrivacidade && <p className="text-xs" style={{ color: '#f87171' }}>{erroPrivacidade}</p>}
        </div>
      </div>

      {/* Aparência e Sistema */}
      <div className="rounded-xl px-5 py-2" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-2)' }}>
        <div className="flex items-center gap-2 py-3" style={{ borderBottom: '1px solid var(--border-1)' }}>
          <Palette size={17} style={{ color: 'var(--accent-400)' }} />
          <h4 className="font-semibold text-heading text-sm">Sistema</h4>
        </div>
        <SettingItem icon={Palette} title="Modo Escuro" description="Interface com tema escuro (desative para o modo claro)">
          <Toggle checked={theme === 'dark'} onChange={toggleTheme} />
        </SettingItem>
        <SettingItem icon={Palette} title="Cor do sistema" description="Escolha a cor de destaque da interface (botões, menus e gráficos)">
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {ACENTOS.map(a => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAccent(a.id)}
                title={a.nome}
                aria-label={`Tema ${a.nome}`}
                aria-pressed={accent === a.id}
                className="w-7 h-7 rounded-full transition-transform hover:scale-110 flex items-center justify-center"
                style={{ background: a.cor, outline: accent === a.id ? '2px solid var(--text-heading)' : '2px solid transparent', outlineOffset: 2 }}
              >
                {accent === a.id && <CheckCircle2 size={14} color="#fff" />}
              </button>
            ))}
          </div>
        </SettingItem>
      </div>

      {/* Versão do sistema */}
      <div className="text-center py-4">
        <p className="text-xs" style={{ color: '#4b5563' }}>GymFlow v1.0.0 · Desenvolvido com ❤️ para academias</p>
      </div>
    </div>
  );
}
