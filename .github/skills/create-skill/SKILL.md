---
name: create-skill
user-invocable: true
description: "Create or update a workspace skill file that guides the user through authoring a VS Code agent skill (SKILL.md)."
---

# Create Skill

## Use when

- You need a reusable workspace skill to generate or revise a `SKILL.md` file.
- The user wants a consistent workflow for skill authoring in this repository.
- You are packaging a multi-step guidance process, not just a single prompt.

## What this skill does

1. Helps determine whether the new customization should be workspace-scoped or personal.
2. Identifies the correct skill file location and naming convention.
3. Creates the `SKILL.md` file with proper YAML frontmatter and a clear description.
4. Validates that the skill is in an appropriate workspace path.

## Steps

1. Ask the user for the desired skill name and intended scope.
2. Confirm the outcome: what problem the skill should solve.
3. Choose the appropriate file location:
   - Workspace skill: `.github/skills/<name>/SKILL.md`
   - Personal skill: `{{VSCODE_USER_PROMPTS_FOLDER}}/<name>/SKILL.md`
4. Generate the YAML frontmatter and body content.
5. Save the file and verify the path.

## Output

- A workspace skill file at `.github/skills/create-skill/SKILL.md`.
- The new skill is ready for invocation in chat and documents how to create SKILL.md files.

## Example prompts

- `/create-skill Help me build a new SKILL.md for this repository`
- `/create-skill Generate a skill that guides the team to add workspace skills`

## Notes

- Prefer workspace-scoped skills for repo-specific workflows.
- Use this skill when the task involves more than one step or decision point.
- For single-step guidance, use a prompt file instead.
