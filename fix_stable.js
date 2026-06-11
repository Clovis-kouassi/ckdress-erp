const fs = require('fs');
const path = 'app/gestionnaire-stock/page.tsx';
let content = fs.readFileSync(path, 'utf8');
if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);

// 1. Ajouter un ref de garde apres le premier useRef ou useState utile
// On l'ajoute juste avant "const fetchData = async"
const anchor = "const fetchData = async (u?: any) => {";
const guard = `const fetchEnCours = useRef(false);
  const fetchData = async (u?: any) => {
    if (fetchEnCours.current) return;
    fetchEnCours.current = true;
    try {`;
content = content.replace(anchor, guard);

// 2. Fermer le try/finally a la fin de fetchData (avant setLoading(false) final)
// On cherche "setLoading(false)\n  }" qui termine fetchData
const oldEnd = "    setLoading(false)\n  }";
const newEnd = "    setLoading(false)\n    } finally { fetchEnCours.current = false }\n  }";
content = content.replace(oldEnd, newEnd);

fs.writeFileSync(path, content, 'utf8');
console.log('OK - garde anti-chevauchement ajoute');