-- categories

insert into categories (slug, name, description, position, hue, allowsSolutions)
     values ('projects',  'Projects',  'Builds in progress and finished pieces. Show the work, share the cut list.', 1, 60,  false),
            ('tools',     'Tools',     'Hand tools, power tools, jigs and sharpening. Buying, tuning and restoring.', 2, 230, false),
            ('finishing', 'Finishing', 'Oils, stains, shellac, lacquer and everything between sanding and done.',    3, 300, false),
            ('help',      'Help',      'Stuck on a joint, a glue-up or a finish? Ask here and mark the answer that worked.', 4, 150, true);
