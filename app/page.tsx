"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

type RecordItem = {
  id: string;
  image?: string;
  date: string;
  place: string;
  habitat: string;
  cap: string;
  underside: string;
  stipe: string;
  smell: string;
  spore: string;
  note: string;
  candidates: Candidate[];
};

type Candidate = {
  name: string;
  group: string;
  confidence: number;
  risk: "高风险" | "需复核" | "低风险";
  reason: string;
};

const habitats = ["阔叶林", "针阔混交林", "针叶林", "草地", "枯木", "腐殖土", "树根附近"];
const caps = ["褐色", "白色", "黄色", "红色", "灰色", "黏滑", "鳞片", "伞形", "半球形"];
const undersides = ["菌褶", "菌孔", "菌齿", "光滑", "未知"];
const stipes = ["有菌环", "有菌托", "中空", "实心", "网纹", "无明显特征"];
const spores = ["白色", "褐色", "黑色", "粉色", "未测"];

function scoreCandidates(form: Omit<RecordItem, "id" | "image" | "candidates">): Candidate[] {
  const text = [form.habitat, form.cap, form.underside, form.stipe, form.smell, form.spore, form.note].join(" ");
  const rules: Candidate[] = [
    {
      name: "鹅膏菌属候选",
      group: "Amanita",
      confidence: /菌托|有菌环|白色/.test(text) ? 74 : 32,
      risk: "高风险",
      reason: "出现菌环、菌托或白色伞菌特征时，必须排除鹅膏菌属毒菌。",
    },
    {
      name: "牛肝菌类候选",
      group: "Boletales",
      confidence: /菌孔|网纹|褐色|针阔混交/.test(text) ? 68 : 28,
      risk: "需复核",
      reason: "菌盖下方为孔状结构时，常见于牛肝菌类，但仍需观察变色和气味。",
    },
    {
      name: "乳菇/红菇类候选",
      group: "Russulaceae",
      confidence: /菌褶|白色|红色|阔叶林/.test(text) ? 58 : 24,
      risk: "需复核",
      reason: "林下菌褶类且菌肉脆裂时可考虑红菇科，需要补充断面和乳汁信息。",
    },
    {
      name: "多孔菌类候选",
      group: "Polyporales",
      confidence: /枯木|菌孔|半球形/.test(text) ? 62 : 22,
      risk: "低风险",
      reason: "生于枯木且具有孔状子实层时，常见于多孔菌类。",
    },
  ];

  return rules.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}

export default function Home() {
  const [image, setImage] = useState<string>("");
  const [place, setPlace] = useState("");
  const [habitat, setHabitat] = useState(habitats[0]);
  const [cap, setCap] = useState(caps[0]);
  const [underside, setUnderside] = useState(undersides[0]);
  const [stipe, setStipe] = useState(stipes[0]);
  const [smell, setSmell] = useState("");
  const [spore, setSpore] = useState(spores[4]);
  const [note, setNote] = useState("");
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("fungi-records");
    if (stored) setRecords(JSON.parse(stored));
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("fungi-records", JSON.stringify(records));
  }, [records]);

  const currentForm = useMemo(
    () => ({
      date: new Date().toISOString().slice(0, 10),
      place,
      habitat,
      cap,
      underside,
      stipe,
      smell,
      spore,
      note,
    }),
    [place, habitat, cap, underside, stipe, smell, spore, note],
  );

  const candidates = useMemo(() => scoreCandidates(currentForm), [currentForm]);

  function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(file);
  }

  function saveRecord(event: FormEvent) {
    event.preventDefault();
    const item: RecordItem = {
      id: crypto.randomUUID(),
      image,
      ...currentForm,
      candidates,
    };
    setRecords((items) => [item, ...items].slice(0, 50));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  return (
    <main className="app-shell">
      <section className="capture-panel" aria-label="菌类拍照识别">
        <div className="brand-row">
          <span className="brand-mark">CB</span>
          <div>
            <p className="eyebrow">长白山菌类识别记录</p>
            <h1>拍照、初判、留档、复核</h1>
          </div>
        </div>

        <label className="photo-box">
          {image ? (
            <img src={image} alt="已上传的菌类照片" />
          ) : (
            <span>
              <strong>拍照或上传菌类照片</strong>
              <small>支持手机相机，照片只保存在本机浏览器</small>
            </span>
          )}
          <input accept="image/*" capture="environment" type="file" onChange={handleImage} />
        </label>

        <form className="field-grid" onSubmit={saveRecord}>
          <label>
            <span>地点</span>
            <input
              value={place}
              onChange={(event) => setPlace(event.target.value)}
              placeholder="如：长白山北坡阔叶林"
            />
          </label>

          <label>
            <span>生境</span>
            <select value={habitat} onChange={(event) => setHabitat(event.target.value)}>
              {habitats.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          <label>
            <span>菌盖</span>
            <select value={cap} onChange={(event) => setCap(event.target.value)}>
              {caps.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          <label>
            <span>下表面</span>
            <select value={underside} onChange={(event) => setUnderside(event.target.value)}>
              {undersides.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          <label>
            <span>菌柄</span>
            <select value={stipe} onChange={(event) => setStipe(event.target.value)}>
              {stipes.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          <label>
            <span>孢子印</span>
            <select value={spore} onChange={(event) => setSpore(event.target.value)}>
              {spores.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          <label>
            <span>气味</span>
            <input
              value={smell}
              onChange={(event) => setSmell(event.target.value)}
              placeholder="如：无明显气味、杏仁味、刺激味"
            />
          </label>

          <label className="wide">
            <span>补充记录</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="可写伴生树种、断面变色、是否有乳汁、数量等"
            />
          </label>

          <button type="submit">{saved ? "已保存" : "保存这条记录"}</button>
        </form>
      </section>

      <section className="result-panel" aria-label="识别候选结果">
        <div className="warning">
          <strong>安全提示</strong>
          <p>本工具仅供科普和记录。任何菌类都不能凭照片或 AI 结果判断可食用。</p>
        </div>

        <div className="card-list">
          <h2>当前候选</h2>
          {candidates.map((candidate) => (
            <article className="candidate-card" key={candidate.name}>
              <div>
                <h3>{candidate.name}</h3>
                <p>{candidate.group}</p>
              </div>
              <span className={`risk ${candidate.risk === "高风险" ? "danger" : ""}`}>
                {candidate.risk}
              </span>
              <meter min="0" max="100" value={candidate.confidence} />
              <p>{candidate.reason}</p>
            </article>
          ))}
        </div>

        <div className="record-list">
          <div className="section-head">
            <h2>本机记录</h2>
            <span>{records.length} 条</span>
          </div>
          {records.length === 0 ? (
            <p className="empty">还没有保存记录。</p>
          ) : (
            records.map((item) => (
              <article className="record-card" key={item.id}>
                {item.image ? <img src={item.image} alt="" /> : <div className="image-placeholder" />}
                <div>
                  <strong>{item.place || "未填写地点"}</strong>
                  <p>
                    {item.date} / {item.habitat} / {item.candidates[0]?.name}
                  </p>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
