/* Datos que no vienen de Morningstar y se actualizan a mano (TIR y duración de fondos de renta fija).
   Se aplican encima de data.js, así no se pierden cuando se regenera. Actualizado el 26/11/2026. */
window.OVERRIDES = {
  "ES0176954008": { tir: 4.01, dur: 1.25 }, // Renta 4 Renta Fija R FI
  "ES0128522002": { tir: 4.72, dur: 2.69 }  // Renta 4 Valor Relativo R FI
};
