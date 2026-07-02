-- تغيير لون الهوية الافتراضي للشركات الجديدة إلى الذهبي المعتمد للنظام (#CE902F)،
-- وتحديث الشركات الحالية التي لا تزال على اللون الافتراضي القديم (البنفسجي).
alter table public.companies alter column primary_color set default '#CE902F';

update public.companies set primary_color = '#CE902F' where primary_color = '#7C3AED';
