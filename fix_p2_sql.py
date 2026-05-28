import codecs

with codecs.open('Supabase_Phase2.sql', 'r', 'utf-8') as f:
    content = f.read()

content = content.replace('-- Table: ft_machine', 'DROP TABLE IF EXISTS public.ft_machine CASCADE;\n-- Table: ft_machine')
content = content.replace('-- Table: ft_breakdown_log', 'DROP TABLE IF EXISTS public.ft_breakdown_log CASCADE;\n-- Table: ft_breakdown_log')

with codecs.open('Supabase_Phase2.sql', 'w', 'utf-8') as f:
    f.write(content)

print("Added DROP TABLE statements to Supabase_Phase2.sql")
