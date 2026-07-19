use std::path::Path;

use super::prompt;

#[test]
fn prompt_requires_contextual_numbered_findings() {
    let value = prompt(Path::new("/workspace/mokabook"));

    assert!(value.contains("/workspace/mokabook"));
    assert!(value.contains("severity"));
    assert!(value.contains("lettered solution options"));
    assert!(value.contains("origin/main"));
}
