import { Scissors, Instagram, Facebook, Mail, Phone } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="bg-card/50 border-t border-border">
      <div className="section-container py-16">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-gold flex items-center justify-center">
                <Scissors className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display text-2xl">BARBERCLUB</span>
            </Link>
            <p className="text-muted-foreground text-sm mb-6">
              A plataforma de assinatura de cortes de cabelo mais inovadora do Brasil.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center hover:bg-primary/20 transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center hover:bg-primary/20 transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-bold mb-4">Para Você</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link to="/planos" className="hover:text-primary transition-colors">Planos</Link></li>
              <li><Link to="/como-funciona" className="hover:text-primary transition-colors">Como Funciona</Link></li>
              <li><Link to="/barbearias" className="hover:text-primary transition-colors">Barbearias Parceiras</Link></li>
              <li><Link to="/faq" className="hover:text-primary transition-colors">Perguntas Frequentes</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Para Barbearias</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link to="/para-saloes" className="hover:text-primary transition-colors">Vantagens</Link></li>
              <li><Link to="/cadastro-salao" className="hover:text-primary transition-colors">Cadastrar Barbearia</Link></li>
              <li><Link to="/login" className="hover:text-primary transition-colors">Área do Parceiro</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold mb-4">Contato</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                contato@barberclub.com.br
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                (11) 99999-9999
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-border mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2024 BarberClub. Todos os direitos reservados.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link to="/termos" className="hover:text-primary transition-colors">Termos de Uso</Link>
            <Link to="/privacidade" className="hover:text-primary transition-colors">Privacidade</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
