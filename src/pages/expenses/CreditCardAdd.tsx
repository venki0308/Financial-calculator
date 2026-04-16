import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { useAppColors } from '../../theme/useAppColors';
import NumberInput from '../../components/NumberInput';
import type { CCCard } from '../../utils/creditCardCalculations';
import {
  createDefaultCard, saveCreditCard, getCreditCardById,
  CARD_COLORS, BANK_SUGGESTIONS,
} from '../../utils/creditCardStorage';

const NETWORKS: CCCard['cardNetwork'][] = ['Visa', 'Mastercard', 'RuPay', 'Amex', 'Diners'];
const REWARD_TYPES: CCCard['rewardType'][] = ['none', 'cashback', 'points', 'miles'];
const APR_PRESETS = [24, 36, 40, 42, 45];
const TOTAL_STEPS = 5;

export default function CreditCardAdd() {
  const { t } = useTranslation();
  const c = useAppColors();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get('edit');

  const [step, setStep] = useState(1);
  const [card, setCard] = useState<CCCard>(() => createDefaultCard());
  const [bankInput, setBankInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hasAnnualFee, setHasAnnualFee] = useState(false);
  const [customApr, setCustomApr] = useState(false);

  useEffect(() => {
    if (editId) {
      const existing = getCreditCardById(editId);
      if (existing) {
        setCard(existing);
        setBankInput(existing.bankName);
        setHasAnnualFee(existing.annualFee > 0);
        setCustomApr(!APR_PRESETS.includes(existing.annualInterestRate));
      }
    }
  }, [editId]);

  const upd = (patch: Partial<CCCard>) => setCard(prev => ({ ...prev, ...patch }));

  const availableCredit = useMemo(
    () => Math.max(0, card.creditLimit - card.currentBalance),
    [card.creditLimit, card.currentBalance],
  );

  const interestFreeDays = useMemo(() => {
    const diff = card.dueDate - card.statementDate;
    return diff > 0 ? diff : diff + 30;
  }, [card.dueDate, card.statementDate]);

  const filteredBanks = useMemo(
    () => bankInput ? BANK_SUGGESTIONS.filter(b => b.toLowerCase().includes(bankInput.toLowerCase())) : BANK_SUGGESTIONS,
    [bankInput],
  );

  const handleSave = () => {
    saveCreditCard(card);
    // Use Router state to signal which tab to activate — avoids setTimeout race condition
    nav('/expenses', { state: { switchTab: 'creditCards' } });
  };

  const canNext = () => {
    if (step === 1) return card.bankName.trim().length > 0 && card.cardName.trim().length > 0;
    return true;
  };

  // ── Shared styles ────────────────────────────────────────────────────────
  const labelStyle: React.CSSProperties = { fontSize: 13, color: c.textSecondary, marginBottom: 4 };
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${c.border}`,
    background: c.inputBg, color: c.text, fontSize: 15, outline: 'none', boxSizing: 'border-box',
  };
  const chipBase: React.CSSProperties = {
    padding: '6px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
    border: `1px solid ${c.border}`, transition: 'all .15s',
  };
  const sectionGap: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 14 };

  const chip = (active: boolean): React.CSSProperties => ({
    ...chipBase,
    background: active ? '#3b82f6' : c.card,
    color: active ? '#fff' : c.text,
    borderColor: active ? '#3b82f6' : c.border,
  });

  // ── Step renderers ───────────────────────────────────────────────────────

  const renderStep1 = () => (
    <div style={sectionGap}>
      {/* Bank Name */}
      <div style={{ position: 'relative' }}>
        <label style={labelStyle}>{t('cc.bankName', 'Bank Name')}</label>
        <input
          style={inputStyle} value={bankInput} placeholder="e.g. HDFC"
          onChange={e => { setBankInput(e.target.value); upd({ bankName: e.target.value }); setShowSuggestions(true); }}
          onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        />
        {showSuggestions && filteredBanks.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: c.card,
            border: `1px solid ${c.border}`, borderRadius: 10, maxHeight: 160, overflowY: 'auto', marginTop: 4 }}>
            {filteredBanks.map(b => (
              <div key={b} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 14, color: c.text }}
                onMouseDown={() => { setBankInput(b); upd({ bankName: b }); setShowSuggestions(false); }}>{b}</div>
            ))}
          </div>
        )}
      </div>
      {/* Card Name */}
      <div>
        <label style={labelStyle}>{t('cc.cardName', 'Card Name')}</label>
        <input style={inputStyle} value={card.cardName} placeholder="e.g. Regalia Gold"
          onChange={e => upd({ cardName: e.target.value })} />
      </div>
      {/* Card Network */}
      <div>
        <label style={labelStyle}>{t('cc.network', 'Card Network')}</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {NETWORKS.map(n => (
            <div key={n} style={chip(card.cardNetwork === n)} onClick={() => upd({ cardNetwork: n })}>{n}</div>
          ))}
        </div>
      </div>
      {/* Last 4 */}
      <div>
        <label style={labelStyle}>{t('cc.last4', 'Last 4 Digits')} ({t('cc.optional', 'optional')})</label>
        <input style={{ ...inputStyle, width: 120 }} value={card.last4Digits} maxLength={4} placeholder="1234"
          onChange={e => upd({ last4Digits: e.target.value.replace(/\D/g, '').slice(0, 4) })} />
      </div>
      {/* Card Color */}
      <div>
        <label style={labelStyle}>{t('cc.cardColor', 'Card Color')}</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {CARD_COLORS.map(clr => (
            <div key={clr} onClick={() => upd({ cardColor: clr })} style={{
              width: 32, height: 32, borderRadius: '50%', background: clr, cursor: 'pointer',
              border: card.cardColor === clr ? '3px solid #fff' : '2px solid transparent',
              boxShadow: card.cardColor === clr ? `0 0 0 2px ${clr}` : 'none',
            }} />
          ))}
        </div>
      </div>
      {/* Card Opened Date */}
      <div>
        <label style={labelStyle}>{t('cc.openedDate', 'Card Opened Date')}</label>
        <input type="date" style={inputStyle} value={card.cardOpenedDate}
          onChange={e => upd({ cardOpenedDate: e.target.value })} />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div style={sectionGap}>
      <NumberInput label={t('cc.creditLimit', 'Credit Limit')} value={card.creditLimit}
        onChange={v => upd({ creditLimit: v })} min={0} max={50_00_000} prefix="₹" step={10000} />
      <NumberInput label={t('cc.currentBalance', 'Current Balance')} value={card.currentBalance}
        onChange={v => upd({ currentBalance: v })} min={0} max={card.creditLimit * 1.2} prefix="₹" step={1000} />
      <NumberInput label={t('cc.statementBalance', 'Statement Balance')} value={card.statementBalance}
        onChange={v => upd({ statementBalance: v })} min={0} max={card.creditLimit * 1.2} prefix="₹" step={1000} />
      <NumberInput label={t('cc.minimumDue', 'Minimum Due')} value={card.minimumDue}
        onChange={v => upd({ minimumDue: v })} min={0}
        max={Math.max(card.statementBalance, card.creditLimit * 1.2, 1)}
        prefix="₹" step={100} />
      <div style={{ padding: '12px 14px', borderRadius: 12, background: c.inputBg, border: `1px solid ${c.border}` }}>
        <div style={{ fontSize: 13, color: c.textSecondary }}>{t('cc.availableCredit', 'Available Credit')}</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#22c55e', marginTop: 4 }}>
          {'\u20B9'}{availableCredit.toLocaleString('en-IN')}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div style={sectionGap}>
      {/* APR */}
      <div>
        <label style={labelStyle}>{t('cc.apr', 'Annual Interest Rate %')}</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          {APR_PRESETS.map(r => (
            <div key={r} style={chip(card.annualInterestRate === r && !customApr)}
              onClick={() => { upd({ annualInterestRate: r }); setCustomApr(false); }}>{r}%</div>
          ))}
          <div style={chip(customApr)} onClick={() => setCustomApr(true)}>{t('cc.custom', 'Custom')}</div>
        </div>
        {customApr && (
          <NumberInput label="" value={card.annualInterestRate}
            onChange={v => upd({ annualInterestRate: v })} min={0} max={60} suffix="%" step={0.5} />
        )}
      </div>
      {/* Annual Fee toggle */}
      <div>
        <label style={labelStyle}>{t('cc.annualFee', 'Annual Fee')}</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: hasAnnualFee ? 8 : 0 }}>
          <div style={chip(!hasAnnualFee)} onClick={() => { setHasAnnualFee(false); upd({ annualFee: 0 }); }}>
            {t('cc.lifetimeFree', 'Lifetime Free')}
          </div>
          <div style={chip(hasAnnualFee)} onClick={() => setHasAnnualFee(true)}>
            {t('cc.hasFee', 'Has Fee')}
          </div>
        </div>
        {hasAnnualFee && (
          <>
            <NumberInput label={t('cc.feeAmount', 'Fee Amount')} value={card.annualFee}
              onChange={v => upd({ annualFee: v })} min={0} max={100000} prefix="₹" step={100} />
            <div style={{ marginTop: 10 }}>
              <NumberInput label={t('cc.feeWaiverSpend', 'Fee Waiver Spend')} value={card.feeWaiverSpend}
                onChange={v => upd({ feeWaiverSpend: v })} min={0} max={50_00_000} prefix="₹" step={10000} />
            </div>
          </>
        )}
      </div>
      <NumberInput label={t('cc.cashAdvanceFee', 'Cash Advance Fee')} value={card.cashAdvanceFee}
        onChange={v => upd({ cashAdvanceFee: v })} min={0} max={10} suffix="%" step={0.5} />
      <NumberInput label={t('cc.forexMarkup', 'Forex Markup')} value={card.forexMarkup}
        onChange={v => upd({ forexMarkup: v })} min={0} max={10} suffix="%" step={0.5} />
      <NumberInput label={t('cc.latePaymentFee', 'Late Payment Fee')} value={card.latePaymentFee}
        onChange={v => upd({ latePaymentFee: v })} min={0} max={5000} prefix="₹" step={50} />
      <NumberInput label={t('cc.overLimitFee', 'Over-limit Fee')} value={card.overLimitFee}
        onChange={v => upd({ overLimitFee: v })} min={0} max={5000} prefix="₹" step={50} />
    </div>
  );

  const renderStep4 = () => (
    <div style={sectionGap}>
      <NumberInput label={t('cc.statementDate', 'Statement Date (Day)')} value={card.statementDate}
        onChange={v => upd({ statementDate: v })} min={1} max={31} step={1} />
      <NumberInput label={t('cc.dueDate', 'Due Date (Day)')} value={card.dueDate}
        onChange={v => upd({ dueDate: v })} min={1} max={31} step={1} />
      <div style={{ padding: '12px 14px', borderRadius: 12, background: c.inputBg, border: `1px solid ${c.border}` }}>
        <div style={{ fontSize: 13, color: c.textSecondary }}>{t('cc.interestFree', 'Interest-free Period')}</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#3b82f6', marginTop: 4 }}>
          {interestFreeDays} {t('cc.days', 'days')}
        </div>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div style={sectionGap}>
      {/* Reward type */}
      <div>
        <label style={labelStyle}>{t('cc.rewardType', 'Reward Type')}</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {REWARD_TYPES.map(rt => (
            <div key={rt} style={chip(card.rewardType === rt)} onClick={() => upd({ rewardType: rt })}>
              {t(`cc.reward_${rt}`, rt === 'none' ? 'None' : rt.charAt(0).toUpperCase() + rt.slice(1))}
            </div>
          ))}
        </div>
      </div>
      {card.rewardType !== 'none' && (
        <>
          <NumberInput label={t('cc.baseRewardRate', 'Base Reward Rate')}
            value={card.baseRewardRate} onChange={v => upd({ baseRewardRate: v })}
            min={0} max={50} suffix={card.rewardType === 'cashback' ? '%' : 'x'} step={0.1} />
          <NumberInput label={t('cc.pendingPoints', 'Pending Points')}
            value={card.pendingRewardPoints} onChange={v => upd({ pendingRewardPoints: v })}
            min={0} max={10_00_000} step={100} />
          {card.rewardType !== 'cashback' && (
            <NumberInput label={t('cc.pointValue', 'Point Value')} prefix="₹"
              value={card.rewardValuePerPoint} onChange={v => upd({ rewardValuePerPoint: v })}
              min={0} max={100} step={0.05} />
          )}
          <div>
            <label style={labelStyle}>{t('cc.rewardExpiry', 'Reward Expiry Date')}</label>
            <input type="date" style={inputStyle} value={card.rewardExpiryDate || ''}
              onChange={e => upd({ rewardExpiryDate: e.target.value || undefined })} />
          </div>
        </>
      )}
      <NumberInput label={t('cc.annualSpend', 'Annual Spend')} value={card.annualSpend}
        onChange={v => upd({ annualSpend: v })} min={0} max={1_00_00_000} prefix="₹" step={10000} />
      <div>
        <label style={labelStyle}>{t('cc.notes', 'Notes')}</label>
        <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={card.notes}
          onChange={e => upd({ notes: e.target.value })} placeholder={t('cc.notesPlaceholder', 'Any extra notes...')} />
      </div>
    </div>
  );

  const STEP_TITLES = [
    t('cc.step1', 'Card Identity'), t('cc.step2', 'Credit & Balance'),
    t('cc.step3', 'Rates & Fees'), t('cc.step4', 'Dates'), t('cc.step5', 'Rewards'),
  ];

  // ── Main render ──────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: c.bg, color: c.text }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 16px 8px',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)',
        position: 'sticky', top: 0, zIndex: 20, background: c.bg }}>
        <ArrowLeft size={22} style={{ cursor: 'pointer' }} onClick={() => nav(-1)} />
        <span style={{ fontSize: 18, fontWeight: 700 }}>
          {editId ? t('cc.editCard', 'Edit Card') : t('cc.addCard', 'Add Credit Card')}
        </span>
      </div>

      {/* Step indicator */}
      <div style={{ padding: '8px 16px 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => {
          const s = i + 1;
          const done = s < step;
          const active = s === step;
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 600,
                background: done ? '#22c55e' : active ? '#3b82f6' : c.inputBg,
                color: done || active ? '#fff' : c.textMuted,
                transition: 'all .2s',
              }}>
                {done ? <Check size={14} /> : s}
              </div>
              {s < TOTAL_STEPS && (
                <div style={{ flex: 1, height: 2, borderRadius: 1,
                  background: done ? '#22c55e' : c.border, transition: 'all .2s' }} />
              )}
            </div>
          );
        })}
      </div>
      <div style={{ padding: '2px 16px 12px', fontSize: 14, fontWeight: 600, color: c.textSecondary }}>
        {step}/{TOTAL_STEPS} &mdash; {STEP_TITLES[step - 1]}
      </div>

      {/* Form body */}
      <div style={{ padding: '0 16px 120px' }}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
      </div>

      {/* Bottom nav buttons */}
      <div style={{
        position: 'fixed', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)', left: 0, right: 0, padding: '12px 16px',
        background: c.navBg, backdropFilter: 'blur(12px)',
        borderTop: `1px solid ${c.border}`,
        display: 'flex', gap: 12, zIndex: 30,
        maxWidth: 428, margin: '0 auto',
      }}>
        {step > 1 && (
          <button onClick={() => setStep(s => s - 1)} style={{
            flex: 1, padding: '12px 0', borderRadius: 12, border: `1px solid ${c.border}`,
            background: c.card, color: c.text, fontSize: 15, fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <ChevronLeft size={18} /> {t('cc.back', 'Back')}
          </button>
        )}
        {step < TOTAL_STEPS ? (
          <button disabled={!canNext()} onClick={() => setStep(s => s + 1)} style={{
            flex: 1, padding: '12px 0', borderRadius: 12, border: 'none',
            background: canNext() ? '#3b82f6' : c.border, color: '#fff', fontSize: 15,
            fontWeight: 600, cursor: canNext() ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            opacity: canNext() ? 1 : 0.5,
          }}>
            {t('cc.next', 'Next')} <ChevronRight size={18} />
          </button>
        ) : (
          <button onClick={handleSave} style={{
            flex: 1, padding: '12px 0', borderRadius: 12, border: 'none',
            background: '#22c55e', color: '#fff', fontSize: 15, fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <Check size={18} /> {editId ? t('cc.updateCard', 'Update Card') : t('cc.saveCard', 'Save Card')}
          </button>
        )}
      </div>
    </div>
  );
}
