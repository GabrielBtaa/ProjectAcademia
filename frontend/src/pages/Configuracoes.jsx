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
} from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { apiFetch } from '../lib/api';

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
          style={{ background: 'rgba(37, 99, 235, 0.1)' }}
        >
          <Icon size={17} style={{ color: '#60a5fa' }} />
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
      style={{ background: checked ? '#2563eb' : 'var(--border-4)' }}
    >
      <span
        className="inline-block w-4 h-4 transform rounded-full bg-white transition-transform shadow-sm"
        style={{ transform: checked ? 'translateX(24px)' : 'translateX(4px)' }}
      />
    </button>
  );
}

const CHAVE_ACADEMIA = 'gymflow_dados_academia';

function carregarDadosAcademia() {
  try {
    const salvo = localStorage.getItem(CHAVE_ACADEMIA);
    return salvo ? JSON.parse(salvo) : { nomeAcademia: '', cnpj: '', telefone: '', endereco: '' };
  } catch {
    return { nomeAcademia: '', cnpj: '', telefone: '', endereco: '' };
  }
}

/**
 * Página de Configurações
 * Tela básica de configurações do sistema.
 */
export default function Configuracoes() {
  const { theme, toggleTheme } = useTheme();
  const [config, setConfig] = useState({
    notifEmail: true,
    notifWhatsapp: false,
    notifVencimentos: true,
    backupAuto: true,
  });
  const [dadosAcademia, setDadosAcademia] = useState(carregarDadosAcademia);
  const [salvandoAcademia, setSalvandoAcademia] = useState(false);
  const [academiaSalva, setAcademiaSalva] = useState(false);

  const [senhaForm, setSenhaForm] = useState({ senhaAtual: '', novaSenha: '', confirmarSenha: '' });
  const [senhaLoading, setSenhaLoading] = useState(false);
  const [senhaErro, setSenhaErro] = useState(null);
  const [senhaSucesso, setSenhaSucesso] = useState(false);

  const toggle = (key) => setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  const updateAcademia = (key, value) => setDadosAcademia(prev => ({ ...prev, [key]: value }));

  const handleSalvarAcademia = () => {
    setSalvandoAcademia(true);
    localStorage.setItem(CHAVE_ACADEMIA, JSON.stringify(dadosAcademia));
    setTimeout(() => {
      setSalvandoAcademia(false);
      setAcademiaSalva(true);
      setTimeout(() => setAcademiaSalva(false), 2500);
    }, 300);
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
      <div>
        <h3 className="text-xl font-bold text-heading">Configurações</h3>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Gerencie as preferências do seu sistema</p>
      </div>

      {/* Dados da Academia */}
      <div className="rounded-xl p-5" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-2)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Globe size={17} style={{ color: '#60a5fa' }} />
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
          <button className="btn-primary mt-2" onClick={handleSalvarAcademia} disabled={salvandoAcademia}>
            {academiaSalva ? <CheckCircle2 size={14} /> : <Save size={14} />}
            {salvandoAcademia ? 'Salvando...' : academiaSalva ? 'Salvo!' : 'Salvar Dados'}
          </button>
        </div>
      </div>

      {/* Alterar Senha */}
      <div className="rounded-xl p-5" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-2)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Lock size={17} style={{ color: '#60a5fa' }} />
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
          <Bell size={17} style={{ color: '#60a5fa' }} />
          <h4 className="font-semibold text-heading text-sm">Notificações</h4>
        </div>
        <SettingItem icon={Bell} title="Notificações por E-mail" description="Receba alertas de vencimentos por e-mail">
          <Toggle checked={config.notifEmail} onChange={() => toggle('notifEmail')} />
        </SettingItem>
        <SettingItem icon={Bell} title="Notificações por WhatsApp" description="Envio automático para alunos inadimplentes">
          <Toggle checked={config.notifWhatsapp} onChange={() => toggle('notifWhatsapp')} />
        </SettingItem>
        <SettingItem icon={Bell} title="Alerta de Vencimentos" description="Notificar 3 dias antes do vencimento">
          <Toggle checked={config.notifVencimentos} onChange={() => toggle('notifVencimentos')} />
        </SettingItem>
      </div>

      {/* Aparência e Sistema */}
      <div className="rounded-xl px-5 py-2" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-2)' }}>
        <div className="flex items-center gap-2 py-3" style={{ borderBottom: '1px solid var(--border-1)' }}>
          <Palette size={17} style={{ color: '#60a5fa' }} />
          <h4 className="font-semibold text-heading text-sm">Sistema</h4>
        </div>
        <SettingItem icon={Palette} title="Modo Escuro" description="Interface com tema escuro (desative para o modo claro)">
          <Toggle checked={theme === 'dark'} onChange={toggleTheme} />
        </SettingItem>
        <SettingItem icon={Shield} title="Backup Automático" description="Salvar dados automaticamente toda noite">
          <Toggle checked={config.backupAuto} onChange={() => toggle('backupAuto')} />
        </SettingItem>
      </div>

      {/* Versão do sistema */}
      <div className="text-center py-4">
        <p className="text-xs" style={{ color: '#4b5563' }}>GymFlow v1.0.0 · Desenvolvido com ❤️ para academias</p>
      </div>
    </div>
  );
}
