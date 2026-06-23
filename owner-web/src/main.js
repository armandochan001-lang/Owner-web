import "./style.css";
import { getDailyCuts } from "./services/dailyCuts";
import { supabase } from "./services/supabase";

async function loadCuts() {
  const cuts = await getDailyCuts();
console.log(cuts);
const branches = [...new Set(
  cuts.map(c => c.branch).filter(Boolean)
)];
document.querySelector("#app").innerHTML = `
  <div style="
    max-width:1200px;
    margin:40px auto;
    padding:20px;
  ">

<div style="
  display:flex;
  justify-content:space-between;
  align-items:center;
  margin-bottom:20px;
">
  <h1>Panel del Dueño</h1>

  <button
    id="logout-btn"
    style="
      padding:10px 16px;
      border:none;
      border-radius:8px;
      cursor:pointer;
    "
  >
    Cerrar sesión
  </button>
</div>

<div style="margin-bottom:20px;">
  <input
    id="expense-search"
    type="text"
    placeholder="Buscar gasto global..."
    style="
      width:100%;
      padding:12px;
      border:1px solid #ddd;
      border-radius:10px;
      font-size:16px;
    "
  />
</div>

<div id="search-results"></div>
<div id="search-results"></div>

<div style="margin-bottom:20px;">
  <input
    id="cut-date"
    type="date"
    style="
      padding:12px;
      border:1px solid #ddd;
      border-radius:10px;
      font-size:16px;
 background:white;
  color:black;
  min-height:44px;
    "
  >
</div>

<div
  id="branches"
  style="
    display:flex;
    gap:10px;
    flex-wrap:wrap;
    margin-bottom:20px;
  "
></div>


    <div id="cuts"></div>
  </div>
`;

  const container = document.querySelector("#cuts");
container.innerHTML = "";
const branchesContainer =
  document.querySelector("#branches");
const searchInput =
  document.querySelector("#expense-search");

const searchResults =
  document.querySelector("#search-results");
const dateInput =
  document.querySelector("#cut-date");
document
  .querySelector("#logout-btn")
  ?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    location.reload();
  });

branchesContainer.innerHTML =
  branches.map(branch => `
    <button
      class="branch-btn"
      data-branch="${branch}"
      style="
        padding:12px 20px;
        border:none;
        border-radius:10px;
        cursor:pointer;
        font-size:16px;
      "
    >
      ${branch}
    </button>
  `).join("");

searchInput.addEventListener("input", () => {
  const term =
    searchInput.value
      .trim()
      .toLowerCase();

  if (!term) {
    searchResults.innerHTML = "";
    return;
  }

  const matches = [];

  cuts.forEach(cut => {
    (cut.expenses_list || []).forEach(expense => {
      const concept =
        (expense.concept || "")
          .toLowerCase();

      if (concept.includes(term)) {
        matches.push({
          branch: cut.branch,
          date: cut.cut_date,
          concept: expense.concept,
          amount: expense.amount,
        });
      }
    });
  });

matches.sort((a, b) =>
  new Date(b.date) - new Date(a.date)
);
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(
  sevenDaysAgo.getDate() - 7
);

const recentMatches = matches.filter(
  m => new Date(m.date) >= sevenDaysAgo
);

const oldMatches = matches.filter(
  m => new Date(m.date) < sevenDaysAgo
);

  if (!matches.length) {
    searchResults.innerHTML = `
      <p>No se encontraron gastos.</p>
    `;
    return;
  }
const renderCard = (m) => `
  <div style="
    background:#fff5f5;
    border:1px solid #f1d5d5;
    border-radius:10px;
    padding:12px;
    margin-bottom:10px;
  ">
    <strong>${m.concept}</strong><br>
    Sucursal: ${m.branch}<br>
Fecha: ${new Date(m.date).toLocaleDateString("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
})}<br>
    Monto: $${m.amount}
  </div>
`;

searchResults.innerHTML =
  recentMatches.map(renderCard).join("");

if (oldMatches.length) {
  searchResults.innerHTML += `
    <button
      id="show-all-results"
      style="
        padding:10px 16px;
        border:none;
        border-radius:10px;
        cursor:pointer;
        font-weight:bold;
      "
    >
      Ver historial completo (${oldMatches.length} resultados más)
    </button>
  `;

  setTimeout(() => {
    document
      .querySelector("#show-all-results")
      ?.addEventListener("click", () => {
        searchResults.innerHTML =
          matches.map(renderCard).join("");
      });
  }, 0);
}


});

document
  .querySelectorAll(".branch-btn")
  .forEach(btn => {
    btn.addEventListener("click", () => {
      const branch =
        btn.dataset.branch;
const selectedDate =
  dateInput.value;

let cut;

if (selectedDate) {
  cut = cuts.find(
    c =>
      c.branch === branch &&
      c.cut_date === selectedDate
  );
} else {
  cut = cuts
  .filter(
    c => c.branch === branch
  )
  .sort(
    (a, b) =>
      new Date(b.cut_date) -
      new Date(a.cut_date)
  )[0];
}

console.log(cut);
if (!cut) {
  container.innerHTML = `
    <h2>
      No existe corte para esa fecha
    </h2>
  `;
  return;
}        
container.innerHTML = `
  <h2 style="margin-bottom:20px;">
    Repartidores - ${branch}
  </h2>

  <div style="
    display:grid;
    grid-template-columns:repeat(3,1fr);
    gap:15px;
    margin-bottom:25px;
  ">
    <div style="
      background:white;
      border:1px solid #ddd;
      border-radius:12px;
      padding:20px;
      text-align:center;
    ">
      <div>Tickets usados</div>
      <h2>${cut.driver_cuts.length}</h2>
    </div>

    <div style="
      background:white;
      border:1px solid #ddd;
      border-radius:12px;
      padding:20px;
      text-align:center;
    ">
      <div>Total cobrado</div>
      <h2>${cut.sales}</h2>
    </div>

    <div style="
      background:white;
      border:1px solid #ddd;
      border-radius:12px;
      padding:20px;
      text-align:center;
    ">
<div>Pizzas vendidas</div>
<h2>${cut.total_pizzas || 0}</h2>

    </div>
  </div>

  <div style="
    display:grid;
    grid-template-columns:2fr 1fr;
    gap:20px;
  ">

<div style="
  background:white;
  border:1px solid #ddd;
  border-radius:12px;
  padding:20px;
  min-height:400px;
">

<h3>CANCELACIONES DEL DÍA</h3>

<div>
  ${(cut.tickets || [])
.filter(t => t.canceled)
    .length === 0
    ? `<p style="color:#666;">No hubo cancelaciones</p>`
    : (cut.tickets || [])
.filter(t => t.canceled)
.map(t => `
  <div style="
    display:inline-block;
    margin:4px;
    padding:10px 14px;
    border-radius:10px;
    background:#ffecec;
    border:1px solid #f44336;
    font-weight:600;
  ">
    🎟️ Ticket ${t.ticket}
  </div>
`).join("")

  }
</div>
      <h3>CORTE DEL DIA</h3>

      <hr>

<div style="
  display:flex;
  justify-content:space-between;
  align-items:center;
  font-weight:bold;
  font-size:24px;
  margin-bottom:20px;
  padding:12px;
  background:#f5f5f5;
  border-radius:10px;
">
  <span>VENTAS TOTALES</span>
  <span>$${cut.sales}</span>
</div>

      <div style="
  display:flex;
  justify-content:space-between;
  font-weight:bold;
  margin-bottom:10px;
">
<span style="
  font-size:18px;
  font-weight:700;
">
  Gastos Totales
</span>

<span style="
  color:#d32f2f;
  font-size:28px;
  font-weight:800;
">
  $${(cut.expenses_list || []).reduce((sum, e) => sum + (e.amount || 0), 0)}
</span>


</div>

<div style="margin-top:10px;">
  ${(cut.expenses_list || []).map(e => `
<div style="
  display:flex;
  justify-content:space-between;
  align-items:center;
  padding:12px 16px;
  margin-bottom:8px;
  border-radius:10px;
  background:#fff5f5;
  border:1px solid #f1d5d5;
">
  <span style="
    font-weight:500;
  ">
    ${e.concept || "Sin concepto"}
  </span>

  <strong style="
    color:#d32f2f;
    font-size:18px;
  ">
    $${e.amount || 0}
  </strong>
</div>

  `).join("")}
</div>

      <div style="
  display:flex;
  justify-content:space-between;
  font-weight:bold;
  margin-top:20px;
  margin-bottom:10px;
">
<span style="
  font-size:18px;
  font-weight:700;
">
  Ingresos
</span>

<span style="
  color:#2e7d32;
  font-size:28px;
  font-weight:800;
">
  $${(cut.incomes_list || []).reduce((sum, i) => sum + (i.amount || 0), 0)}
</span>


</div>

<div style="margin-top:10px;">
${(cut.incomes_list || []).map(i => `
  <div style="
    display:flex;
    justify-content:space-between;
    align-items:center;
    padding:12px 16px;
    margin-bottom:8px;
    border-radius:10px;
    background:#f3fff5;
    border:1px solid #cfe8d1;
  ">
    <span style="
      font-weight:500;
    ">
      ${i.concept || "Sin concepto"}
    </span>

    <strong style="
      color:#2e7d32;
      font-size:18px;
    ">
      $${i.amount || 0}
    </strong>
  </div>
`).join("")}
</div>
      <hr>

<div style="
  margin-top:20px;
  background:#2e7d32;
  color:white;
  border-radius:12px;
  padding:20px;
  text-align:center;
">
  <div style="
    font-size:18px;
    font-weight:600;
    margin-bottom:10px;
  ">
    TOTAL A ENTREGAR
  </div>

<div style="
  margin-top:15px;
  margin-bottom:15px;
  font-size:15px;
  opacity:0.9;
">
  <div style="
    display:flex;
    justify-content:space-between;
    margin-bottom:4px;
  ">
    <span>Ventas</span>
    <span>$${cut.sales}</span>
  </div>

  <div style="
    display:flex;
    justify-content:space-between;
    margin-bottom:4px;
  ">
    <span>+ Ingresos</span>
    <span>$${cut.income}</span>
  </div>

  <div style="
    display:flex;
    justify-content:space-between;
    margin-bottom:8px;
  ">
    <span>- Gastos</span>
    <span>$${cut.expenses}</span>
  </div>

  <hr style="
    border:none;
    border-top:1px solid rgba(255,255,255,.4);
  ">
</div>

<div style="
  font-size:42px;
  font-weight:800;
">
  $${cut.total_to_deliver}
</div>


</div>

    </div>

    <div style="
      background:white;
      border:1px solid #ddd;
      border-radius:12px;
      padding:20px;
      min-height:400px;
    ">
<h3 style="margin-bottom:15px;">RESUMEN POR REPARTIDOR</h3>

${(cut.driver_cuts || []).map(d => `
  <div style="
    border:1px solid #ddd;
    border-radius:12px;
    padding:15px;
    margin-bottom:12px;
    background:#fafafa;
  ">
    <div style="
      font-size:18px;
      font-weight:700;
      margin-bottom:10px;
    ">
      ${d.driver}
    </div>

    <div style="display:flex; justify-content:space-between;">
      <span>Ventas</span>
      <strong>$${d.sales}</strong>
    </div>

    <div style="display:flex; justify-content:space-between;">
      <span>Gastos</span>
      <strong style="color:#d32f2f;">$${d.expenses}</strong>
    </div>

    <div style="display:flex; justify-content:space-between;">
      <span>A entregar</span>
      <strong style="color:#2e7d32;">$${d.delivery}</strong>
    </div>
  </div>
`).join("")}      

    </div>
  </div>
`;
    });
  });

  if (!cuts.length) {
    container.innerHTML = "<p>No hay cortes sincronizados.</p>";
    return;
  }
}
async function start() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    document.querySelector("#app").innerHTML = `
      <div style="
        max-width:400px;
        margin:80px auto;
        padding:20px;
      ">
        <h1>Panel del Dueño</h1>

        <input
          id="email"
          type="email"
          placeholder="Correo"
          style="
            width:100%;
            padding:12px;
            margin-bottom:10px;
          "
        >

        <input
          id="password"
          type="password"
          placeholder="Contraseña"
          style="
            width:100%;
            padding:12px;
            margin-bottom:10px;
          "
        >

        <button
          id="login-btn"
          style="
            width:100%;
            padding:12px;
          "
        >
          Iniciar sesión
        </button>

        <div
          id="login-error"
          style="
            color:red;
            margin-top:10px;
          "
        ></div>
      </div>
    `;

    document
      .querySelector("#login-btn")
      .addEventListener("click", async () => {
        const email =
          document.querySelector("#email").value;

        const password =
          document.querySelector("#password").value;

        const { error } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (error) {
          document.querySelector(
            "#login-error"
          ).textContent = error.message;
          return;
        }

        location.reload();
      });

    return;
  }

  await loadCuts();
}

start();
