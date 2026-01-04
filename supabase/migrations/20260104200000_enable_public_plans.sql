-- Habilita inserção pública na tabela plans para fins de teste de conexão
CREATE POLICY "Enable public insert for testing" ON public.plans FOR INSERT WITH CHECK (true);
