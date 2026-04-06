export default function AdvisoryPresentation() {
    return (
        <div className="page-shell">
            <h2>Advisory Form</h2>
            <p className="muted-copy">Submit details below for operator review.</p>
            <form action="">
                <div>
                    <label>Subject:</label>
                    <input type="text" />
                </div>
                <div>
                    <label>Organization:</label>
                    <select name="orgs">
                        <option value="">Select an Organization</option>
                        <option value="corpA">Corporation A</option>
                        <option value="corpB">Corporation B</option>
                        <option value="corpC">Corporation C</option>
                        <option value="corpD">Corporation D</option>
                        <option value="corpE">Corporation E</option>
                    </select>
                </div>
                <div>
                    <label>Message:</label>
                    <textarea></textarea>
                </div>
                <div>
                    <button type="submit">Submit</button>
                </div>
            </form>
        </div>
    );
}