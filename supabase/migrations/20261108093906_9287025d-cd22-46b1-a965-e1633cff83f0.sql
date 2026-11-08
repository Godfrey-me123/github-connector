ALTER TABLE public.payment_requests REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='payment_requests') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_requests;
  END IF;
END $$;

INSERT INTO public.token_packages (id, name, usages, tokens, price, description, is_active, visibility, sort_order, display_order, tag, bonus)
VALUES
 ('pkg_starter','Starter',3,3,'2000','Basic pack for quick single-card generation',true,'public',1,1,null,0),
 ('pkg-standard','Standard',7,7,'5000','Best for active creators and small print shops',true,'public',2,2,'Most Popular',0),
 ('pkg-pro','Pro Creator',18,18,'10000','Maximum value with priority processing',true,'public',3,3,'Best Value',0)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, usages=EXCLUDED.usages, tokens=EXCLUDED.tokens, price=EXCLUDED.price,
 description=EXCLUDED.description, is_active=EXCLUDED.is_active, tag=EXCLUDED.tag, sort_order=EXCLUDED.sort_order, display_order=EXCLUDED.display_order;

INSERT INTO public.weekly_offers (id, title, description, tokens, price, start_date, end_date, is_active, discount_percent, badge)
VALUES ('offer-special-pass','Special Creator Pass','Get 10 tokens for only 6,000 TZS this week',10,'6000',
 to_char(current_date,'YYYY-MM-DD'), to_char(current_date + 7,'YYYY-MM-DD'), true, 25, '25% OFF')
ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, description=EXCLUDED.description, tokens=EXCLUDED.tokens, price=EXCLUDED.price,
 start_date=EXCLUDED.start_date, end_date=EXCLUDED.end_date, is_active=EXCLUDED.is_active, discount_percent=EXCLUDED.discount_percent, badge=EXCLUDED.badge;