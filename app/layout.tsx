import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'FynlyAx | Controle. Planeje. Evolua.',description:'Sua vida financeira, com clareza. Conheça a demonstração da FynlyAx.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="pt-BR" suppressHydrationWarning><body>{children}</body></html>}
