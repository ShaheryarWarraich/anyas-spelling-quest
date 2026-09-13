import React, { useState } from 'react';
import PinPad from '../components/PinPad.jsx';
import Guide from '../components/Guide.jsx';
import RuleCard from '../components/RuleCard.jsx';
// Grown-up only: finish the rule she's on without playing its remaining lessons, and open the next rule.
export default function SkipRuleScreen({ app, home, onHome }) {
  const [stage, setStage] = useState('pin'); // pin | confirm | done
  const [landed, setLanded] = useState(null);
  const stickers = home.stickers.map(s => s.id);
  const current = (home.todayDay && home.todayDay.status === 'started' && !home.todayDay.redo)
    ? app.content.weeks.find(w => w.rule_id === home.todayDay.weekId) : home.next?.weekEntry.week;
  if (stage === 'pin') return <div className="screen center"><PinPad app={app} title="Grown-up PIN" onOk={() => setStage('confirm')} onCancel={onHome} /></div>;
  if (stage === 'confirm') return (
    <div className="screen center">
      <h2>Mark {current.rule_name} as done and go to the next rule?</h2>
      <div className="row"><RuleCard week={current} mini /><div className="big">➜</div>{home.nextRule && <RuleCard week={home.nextRule} mini />}</div>
      <div className="parent-note">Its remaining lessons are skipped and it gets its badge. Anya can still do it again from <b>Do a rule again</b>, and you can undo this in Grown-ups → Settings → Rules.</div>
      <div className="row">
        <button className="btn primary" onClick={async () => { setLanded(await app.skipToNextRule()); setStage('done'); }}>Yes, next rule</button>
        <button className="btn secondary" onClick={onHome}>Cancel</button>
      </div>
    </div>
  );
  return (
    <div className="screen center fade">
      <Guide text={landed ? `On to ${landed.weekEntry.week.rule_name}!` : 'All the rules are done!'} stickers={stickers} size={170} mood="wow" />
      {landed && <RuleCard week={landed.weekEntry.week} />}
      <button className="btn primary wide" onClick={onHome}>Home</button>
    </div>
  );
}
