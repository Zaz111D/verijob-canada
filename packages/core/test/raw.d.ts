/** Import de fichiers texte bruts par Vitest (« ?raw »), pour contrôler les relevés manuels. */
declare module '*?raw' {
  const content: string;
  export default content;
}
