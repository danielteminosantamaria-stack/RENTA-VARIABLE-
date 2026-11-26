/* Datos del apartado Macro. La tarea diaria (Nota diaria) actualiza este fichero.
   Cada variable: g grupo, n nombre, u unidad (% | pb | idx), v valor, d periodo del dato, p valor anterior, pd periodo anterior,
   ser = serie [[etiqueta, valor], ...] (se amplía cada día; con 3 o más puntos se dibuja la línea). */
window.MACRO = {
 "fecha": "26/11/2026",
 "fuentes": "Eurostat, INE, BCE, Reserva Federal y LSEG, recogidos en la Nota diaria",
 "lecturas": {
  "inf": "La inflación sigue alta: repunta en la zona euro (4,0%) y en EE.UU. (3,7%) y se mantiene en el 4,9% en España. El PCE subyacente, la referencia de la Fed, sube al 3,3%.",
  "tip": "Los bancos centrales siguen en fase de subidas. El mercado descuenta un alza de 25 pb del BCE el 17 de diciembre (87%) y de la Fed el 9 de diciembre (98%).",
  "bon": "Las rentabilidades de los bonos a 10 años han retrocedido en la última semana: el Bund baja al 3,22% y el Treasury al 4,85%. La prima de riesgo de España sigue contenida, en torno a 62 pb.",
  "act": "La actividad aguanta: el PMI compuesto de la zona euro está en 53,1 (máximo en más de tres años) y el paro en EE.UU. es del 4,2%."
 },
 "vars": [
  {"id": "ipc_ez", "g": "inf", "n": "IPC zona euro", "u": "%", "v": 4.0, "d": "oct 2026", "p": 3.8, "pd": "sep 2026", "ser": [["sep", 3.8], ["oct", 4.0]]},
  {"id": "ipc_es", "g": "inf", "n": "IPC España", "u": "%", "v": 4.9, "d": "oct 2026, adelantado", "p": 4.9, "pd": "sep 2026", "ser": [["sep", 4.9], ["oct", 4.9]]},
  {"id": "ipc_us", "g": "inf", "n": "IPC EE.UU.", "u": "%", "v": 3.7, "d": "sep 2026", "p": 3.4, "pd": "ago 2026", "ser": [["ago", 3.4], ["sep", 3.7]]},
  {"id": "pce_us", "g": "inf", "n": "PCE subyacente EE.UU.", "u": "%", "v": 3.3, "d": "oct 2026", "p": 3.0, "pd": "ago 2026", "ser": [["ago", 3.0], ["oct", 3.3]]},
  {"id": "bce", "g": "tip", "n": "Tipo de depósito BCE", "u": "%", "v": 2.50, "d": "29 oct 2026", "p": 2.50, "pd": "10 sep 2026", "dec": 2},
  {"id": "fed", "g": "tip", "n": "Tipos Fed (punto medio del rango 3,75% a 4,00%)", "u": "%", "v": 3.875, "d": "28 oct 2026", "p": 3.875, "pd": "16 sep 2026", "dec": 2, "short": "Tipos Fed", "vt": "3,75% a 4,00%"},
  {"id": "estr", "g": "tip", "n": "€STR", "u": "%", "v": 2.44, "d": "oct 2026", "dec": 2},
  {"id": "eur12", "g": "tip", "n": "Euríbor 12 meses", "u": "%", "v": 3.302, "d": "4 nov 2026", "p": 3.215, "pd": "oct 2026", "dec": 2, "ser": [["oct", 3.215], ["4 nov", 3.302]]},
  {"id": "bund", "g": "bon", "n": "Bono alemán a 10 años", "u": "%", "v": 3.22, "d": "25 nov 2026", "p": 3.40, "pd": "19 nov 2026", "dec": 2, "short": "Bund 10 años", "ser": [["19 nov", 3.40], ["25 nov", 3.22]]},
  {"id": "es10", "g": "bon", "n": "Bono español a 10 años", "u": "%", "v": 3.844, "d": "25 nov 2026", "dec": 2, "short": "España 10 años"},
  {"id": "ust10", "g": "bon", "n": "Bono EE.UU. a 10 años", "u": "%", "v": 4.85, "d": "25 nov 2026", "p": 4.90, "pd": "24 nov 2026", "dec": 2, "short": "EE.UU. 10 años", "ser": [["24 nov", 4.90], ["25 nov", 4.85]]},
  {"id": "pend", "g": "bon", "n": "Pendiente 2 a 10 años EE.UU.", "u": "pb", "v": 24, "d": "25 nov 2026", "p": 29, "pd": "16 nov 2026", "dec": 0},
  {"id": "pr_es", "g": "bon", "n": "Prima de riesgo España frente a Alemania", "u": "pb", "v": 62, "d": "25 nov 2026", "p": 60.6, "pd": "24 nov 2026", "dec": 0, "short": "Prima de riesgo España"},
  {"id": "pmi_ez", "g": "act", "n": "PMI compuesto zona euro", "u": "idx", "v": 53.1, "d": "sep 2026", "dec": 1},
  {"id": "paro_us", "g": "act", "n": "Paro EE.UU.", "u": "%", "v": 4.2, "d": "sep 2026", "p": 4.1, "pd": "ago 2026", "dec": 1}
 ],
 "expect": [
  {"n": "BCE, subida el 17 dic", "v": 87},
  {"n": "Fed, subida el 9 dic", "v": 98}
 ]
};
