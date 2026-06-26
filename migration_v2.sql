-- AEGIS Access Delegation & Shared Workspaces Migration

-- 1. Create Workspace Members table
CREATE TABLE IF NOT EXISTS public.workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    access_role user_role NOT NULL DEFAULT 'Viewer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(owner_id, member_id)
);

-- Enable RLS on delegation mapping
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- 2. RLS Policies for Workspace Members table
DROP POLICY IF EXISTS "Users can view workspace delegations involving them" ON public.workspace_members;
DROP POLICY IF EXISTS "Owners can add workspace delegates" ON public.workspace_members;
DROP POLICY IF EXISTS "Owners and members can revoke access" ON public.workspace_members;

CREATE POLICY "Users can view workspace delegations involving them"
    ON public.workspace_members FOR SELECT
    USING (auth.uid() = owner_id OR auth.uid() = member_id);

CREATE POLICY "Owners can add workspace delegates"
    ON public.workspace_members FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners and members can revoke access"
    ON public.workspace_members FOR DELETE
    USING (auth.uid() = owner_id OR auth.uid() = member_id);

-- 3. Upgrade Productivity tables to support Workspace Members

-- ==================== PROJECTS ====================
DROP POLICY IF EXISTS "Users can CRUD own projects" ON public.projects;
DROP POLICY IF EXISTS "Users and members can select projects" ON public.projects;
DROP POLICY IF EXISTS "Users and write members can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Users and write members can update projects" ON public.projects;
DROP POLICY IF EXISTS "Users and managers can delete projects" ON public.projects;

CREATE POLICY "Users and members can select projects"
    ON public.projects FOR SELECT
    USING (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE owner_id = public.projects.user_id 
            AND member_id = auth.uid()
        )
    );

CREATE POLICY "Users and write members can insert projects"
    ON public.projects FOR INSERT
    WITH CHECK (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE owner_id = user_id 
            AND member_id = auth.uid() 
            AND access_role IN ('Manager', 'Assistant')
        )
    );

CREATE POLICY "Users and write members can update projects"
    ON public.projects FOR UPDATE
    USING (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE owner_id = public.projects.user_id 
            AND member_id = auth.uid() 
            AND access_role IN ('Manager', 'Assistant')
        )
    )
    WITH CHECK (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE owner_id = user_id 
            AND member_id = auth.uid() 
            AND access_role IN ('Manager', 'Assistant')
        )
    );

CREATE POLICY "Users and managers can delete projects"
    ON public.projects FOR DELETE
    USING (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE owner_id = public.projects.user_id 
            AND member_id = auth.uid() 
            AND access_role = 'Manager'
        )
    );

-- ==================== EVENTS ====================
DROP POLICY IF EXISTS "Users can CRUD own events" ON public.events;
DROP POLICY IF EXISTS "Users and members can select events" ON public.events;
DROP POLICY IF EXISTS "Users and write members can insert events" ON public.events;
DROP POLICY IF EXISTS "Users and write members can update events" ON public.events;
DROP POLICY IF EXISTS "Users and managers can delete events" ON public.events;

CREATE POLICY "Users and members can select events"
    ON public.events FOR SELECT
    USING (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE owner_id = public.events.user_id 
            AND member_id = auth.uid()
        )
    );

CREATE POLICY "Users and write members can insert events"
    ON public.events FOR INSERT
    WITH CHECK (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE owner_id = user_id 
            AND member_id = auth.uid() 
            AND access_role IN ('Manager', 'Assistant')
        )
    );

CREATE POLICY "Users and write members can update events"
    ON public.events FOR UPDATE
    USING (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE owner_id = public.events.user_id 
            AND member_id = auth.uid() 
            AND access_role IN ('Manager', 'Assistant')
        )
    )
    WITH CHECK (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE owner_id = user_id 
            AND member_id = auth.uid() 
            AND access_role IN ('Manager', 'Assistant')
        )
    );

CREATE POLICY "Users and managers can delete events"
    ON public.events FOR DELETE
    USING (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE owner_id = public.events.user_id 
            AND member_id = auth.uid() 
            AND access_role = 'Manager'
        )
    );

-- ==================== TASKS ====================
DROP POLICY IF EXISTS "Users can CRUD own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users and members can select tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users and write members can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users and write members can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users and managers can delete tasks" ON public.tasks;

CREATE POLICY "Users and members can select tasks"
    ON public.tasks FOR SELECT
    USING (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE owner_id = public.tasks.user_id 
            AND member_id = auth.uid()
        )
    );

CREATE POLICY "Users and write members can insert tasks"
    ON public.tasks FOR INSERT
    WITH CHECK (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE owner_id = user_id 
            AND member_id = auth.uid() 
            AND access_role IN ('Manager', 'Assistant')
        )
    );

CREATE POLICY "Users and write members can update tasks"
    ON public.tasks FOR UPDATE
    USING (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE owner_id = public.tasks.user_id 
            AND member_id = auth.uid() 
            AND access_role IN ('Manager', 'Assistant')
        )
    )
    WITH CHECK (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE owner_id = user_id 
            AND member_id = auth.uid() 
            AND access_role IN ('Manager', 'Assistant')
        )
    );

CREATE POLICY "Users and managers can delete tasks"
    ON public.tasks FOR DELETE
    USING (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE owner_id = public.tasks.user_id 
            AND member_id = auth.uid() 
            AND access_role = 'Manager'
        )
    );

-- ==================== GOALS ====================
DROP POLICY IF EXISTS "Users can CRUD own goals" ON public.goals;
DROP POLICY IF EXISTS "Users and members can select goals" ON public.goals;
DROP POLICY IF EXISTS "Users and write members can insert goals" ON public.goals;
DROP POLICY IF EXISTS "Users and write members can update goals" ON public.goals;
DROP POLICY IF EXISTS "Users and managers can delete goals" ON public.goals;

CREATE POLICY "Users and members can select goals"
    ON public.goals FOR SELECT
    USING (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE owner_id = public.goals.user_id 
            AND member_id = auth.uid()
        )
    );

CREATE POLICY "Users and write members can insert goals"
    ON public.goals FOR INSERT
    WITH CHECK (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE owner_id = user_id 
            AND member_id = auth.uid() 
            AND access_role IN ('Manager', 'Assistant')
        )
    );

CREATE POLICY "Users and write members can update goals"
    ON public.goals FOR UPDATE
    USING (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE owner_id = public.goals.user_id 
            AND member_id = auth.uid() 
            AND access_role IN ('Manager', 'Assistant')
        )
    )
    WITH CHECK (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE owner_id = user_id 
            AND member_id = auth.uid() 
            AND access_role IN ('Manager', 'Assistant')
        )
    );

CREATE POLICY "Users and managers can delete goals"
    ON public.goals FOR DELETE
    USING (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE owner_id = public.goals.user_id 
            AND member_id = auth.uid() 
            AND access_role = 'Manager'
        )
    );

-- ==================== MILESTONES ====================
DROP POLICY IF EXISTS "Users can CRUD milestones of own goals" ON public.milestones;
DROP POLICY IF EXISTS "Users and members can select milestones" ON public.milestones;
DROP POLICY IF EXISTS "Users and write members can write milestones" ON public.milestones;
DROP POLICY IF EXISTS "Users and write members can update milestones" ON public.milestones;
DROP POLICY IF EXISTS "Users and managers can delete milestones" ON public.milestones;

CREATE POLICY "Users and members can select milestones"
    ON public.milestones FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.goals
            WHERE public.goals.id = public.milestones.goal_id
            AND (
                public.goals.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.workspace_members
                    WHERE owner_id = public.goals.user_id
                    AND member_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Users and write members can write milestones"
    ON public.milestones FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.goals
            WHERE public.goals.id = goal_id
            AND (
                public.goals.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.workspace_members
                    WHERE owner_id = public.goals.user_id
                    AND member_id = auth.uid()
                    AND access_role IN ('Manager', 'Assistant')
                )
            )
        )
    );

CREATE POLICY "Users and write members can update milestones"
    ON public.milestones FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.goals
            WHERE public.goals.id = public.milestones.goal_id
            AND (
                public.goals.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.workspace_members
                    WHERE owner_id = public.goals.user_id
                    AND member_id = auth.uid()
                    AND access_role IN ('Manager', 'Assistant')
                )
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.goals
            WHERE public.goals.id = goal_id
            AND (
                public.goals.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.workspace_members
                    WHERE owner_id = public.goals.user_id
                    AND member_id = auth.uid()
                    AND access_role IN ('Manager', 'Assistant')
                )
            )
        )
    );

CREATE POLICY "Users and managers can delete milestones"
    ON public.milestones FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.goals
            WHERE public.goals.id = public.milestones.goal_id
            AND (
                public.goals.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.workspace_members
                    WHERE owner_id = public.goals.user_id
                    AND member_id = auth.uid()
                    AND access_role = 'Manager'
                )
            )
        )
    );

-- ==================== NOTES ====================
DROP POLICY IF EXISTS "Users can CRUD own notes" ON public.notes;
DROP POLICY IF EXISTS "Users and members can select notes" ON public.notes;
DROP POLICY IF EXISTS "Users and write members can insert notes" ON public.notes;
DROP POLICY IF EXISTS "Users and write members can update notes" ON public.notes;
DROP POLICY IF EXISTS "Users and managers can delete notes" ON public.notes;

CREATE POLICY "Users and members can select notes"
    ON public.notes FOR SELECT
    USING (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE owner_id = public.notes.user_id 
            AND member_id = auth.uid()
        )
    );

CREATE POLICY "Users and write members can insert notes"
    ON public.notes FOR INSERT
    WITH CHECK (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE owner_id = user_id 
            AND member_id = auth.uid() 
            AND access_role IN ('Manager', 'Assistant')
        )
    );

CREATE POLICY "Users and write members can update notes"
    ON public.notes FOR UPDATE
    USING (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE owner_id = public.notes.user_id 
            AND member_id = auth.uid() 
            AND access_role IN ('Manager', 'Assistant')
        )
    )
    WITH CHECK (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE owner_id = user_id 
            AND member_id = auth.uid() 
            AND access_role IN ('Manager', 'Assistant')
        )
    );

CREATE POLICY "Users and managers can delete notes"
    ON public.notes FOR DELETE
    USING (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE owner_id = public.notes.user_id 
            AND member_id = auth.uid() 
            AND access_role = 'Manager'
        )
    );

-- Grant privileges for the new table
GRANT ALL ON TABLE public.workspace_members TO postgres, service_role, authenticated;
