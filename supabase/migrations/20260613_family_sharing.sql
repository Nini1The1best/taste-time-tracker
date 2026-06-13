-- family_groups
CREATE TABLE public.family_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_groups TO authenticated;
GRANT ALL ON public.family_groups TO service_role;
ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own or member groups" ON public.family_groups FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.group_id = family_groups.id AND fm.user_id = auth.uid()
    )
  );
CREATE POLICY "create own groups" ON public.family_groups FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "update own groups" ON public.family_groups FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "delete own groups" ON public.family_groups FOR DELETE TO authenticated
  USING (owner_id = auth.uid());
CREATE TRIGGER family_groups_updated_at BEFORE UPDATE ON public.family_groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- family_members
CREATE TABLE public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'editor', 'viewer')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_members TO authenticated;
GRANT ALL ON public.family_members TO service_role;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view group members" ON public.family_members FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.family_groups fg
      WHERE fg.id = group_id
      AND (fg.owner_id = auth.uid()
           OR EXISTS (SELECT 1 FROM public.family_members fm2 WHERE fm2.group_id = group_id AND fm2.user_id = auth.uid()))
    )
  );
CREATE POLICY "manage members as owner" ON public.family_members FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.family_groups WHERE id = group_id AND owner_id = auth.uid())
  );
CREATE POLICY "update members as owner" ON public.family_members FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.family_groups WHERE id = group_id AND owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.family_groups WHERE id = group_id AND owner_id = auth.uid())
  );
CREATE POLICY "delete members as owner" ON public.family_members FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.family_groups WHERE id = group_id AND owner_id = auth.uid())
  );

-- shared_weeks
CREATE TABLE public.shared_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID NOT NULL REFERENCES public.weeks(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  shared_by_id UUID NOT NULL REFERENCES auth.users(id),
  shared_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(week_id, group_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_weeks TO authenticated;
GRANT ALL ON public.shared_weeks TO service_role;
ALTER TABLE public.shared_weeks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view shared weeks" ON public.shared_weeks FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.weeks w
      WHERE w.id = week_id AND w.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.group_id = group_id AND fm.user_id = auth.uid()
    )
  );
CREATE POLICY "share own weeks" ON public.shared_weeks FOR INSERT TO authenticated
  WITH CHECK (
    shared_by_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.weeks WHERE id = week_id AND user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.family_groups WHERE id = group_id AND owner_id = auth.uid())
  );
CREATE POLICY "delete shared weeks as owner" ON public.shared_weeks FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.weeks WHERE id = week_id AND user_id = auth.uid())
  );

-- invitation_codes (pour partage par lien)
CREATE TABLE public.invitation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  max_uses INT,
  used_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitation_codes TO authenticated;
GRANT ALL ON public.invitation_codes TO service_role;
ALTER TABLE public.invitation_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view group invites" ON public.invitation_codes FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.family_groups WHERE id = group_id AND owner_id = auth.uid())
  );
CREATE POLICY "create invites as owner" ON public.invitation_codes FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.family_groups WHERE id = group_id AND owner_id = auth.uid())
  );
CREATE POLICY "delete invites as owner" ON public.invitation_codes FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.family_groups WHERE id = group_id AND owner_id = auth.uid())
  );

-- meal_slots & ingredients — update RLS to include shared weeks
CREATE POLICY "access shared slots" ON public.meal_slots FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.weeks w
      WHERE w.id = week_id
      AND (w.user_id = auth.uid()
           OR EXISTS (
             SELECT 1 FROM public.shared_weeks sw
             JOIN public.family_members fm ON fm.group_id = sw.group_id
             WHERE sw.week_id = w.id AND fm.user_id = auth.uid()
           ))
    )
  );

CREATE POLICY "access shared ingredients" ON public.ingredients FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meal_slots s
      JOIN public.weeks w ON w.id = s.week_id
      WHERE s.id = meal_slot_id
      AND (w.user_id = auth.uid()
           OR EXISTS (
             SELECT 1 FROM public.shared_weeks sw
             JOIN public.family_members fm ON fm.group_id = sw.group_id
             WHERE sw.week_id = w.id AND fm.user_id = auth.uid()
           ))
    )
  );

CREATE POLICY "access shared shopping" ON public.shopping_lists FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.weeks w
      WHERE w.id = week_id
      AND (w.user_id = auth.uid()
           OR EXISTS (
             SELECT 1 FROM public.shared_weeks sw
             JOIN public.family_members fm ON fm.group_id = sw.group_id
             WHERE sw.week_id = w.id AND fm.user_id = auth.uid()
           ))
    )
  );

CREATE POLICY "edit shopping as member" ON public.shopping_lists FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.weeks w
      WHERE w.id = week_id
      AND (w.user_id = auth.uid()
           OR EXISTS (
             SELECT 1 FROM public.shared_weeks sw
             JOIN public.family_members fm ON fm.group_id = sw.group_id
             WHERE sw.week_id = w.id AND fm.user_id = auth.uid() AND fm.role IN ('editor', 'owner')
           ))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.weeks w
      WHERE w.id = week_id
      AND (w.user_id = auth.uid()
           OR EXISTS (
             SELECT 1 FROM public.shared_weeks sw
             JOIN public.family_members fm ON fm.group_id = sw.group_id
             WHERE sw.week_id = w.id AND fm.user_id = auth.uid() AND fm.role IN ('editor', 'owner')
           ))
    )
  );
