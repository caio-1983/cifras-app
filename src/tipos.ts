export type Letra = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

export interface Nota {
  letra: Letra;
  acidente: number;
}

export interface Tom {
  letra: Letra;
  acidente: number;
  menor: boolean;
}

export interface Acorde {
  raiz: Nota;
  sufixo: string;
  baixo?: Nota;
}

export interface CampoCabecalho {
  chave: string;
  valor: string;
}

export interface Cabecalho {
  campos: CampoCabecalho[];
}

export type Item =
  | { tipo: 'literal'; texto: string }
  | { tipo: 'acorde'; acorde: Acorde; textoOriginal: string };

export interface ItemPosicionado {
  item: Item;
  coluna: number;
}

export type LinhaCorpo =
  | { tipo: 'subtitulo'; texto: string }
  | { tipo: 'cifra'; itens: ItemPosicionado[] }
  | { tipo: 'posicional'; itens: ItemPosicionado[] }
  | { tipo: 'letra'; texto: string }
  | { tipo: 'separador' };

export interface Musica {
  cabecalho: Cabecalho;
  corpo: LinhaCorpo[];
}
