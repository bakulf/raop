require 'kramdown'
require 'yaml'
require 'pp'

def find_classes(what, classes)
  what = [what] if not what.is_a?(Array)

  list = []
  what.each do |sc|
    found = nil
    classes.each do |cc|
      if sc == cc['name']
        found = cc
        break
      end
    end

    if found.nil?
      puts "Class #{sc} doesn't exist."
      exit
    end

    list.push  "<a href=\"#term_#{found['name']}\">#{found['name']}</a>"
  end

  return "| #{list.join(" | ")} |"
end

def escape(str)
  return str.gsub('<', '&lt;')
            .gsub('>', '&gt;')
end

begin
  data = YAML.load_file ARGV[0]
rescue
  puts "Error parsing the yamlfile."
  exit
end

['template', 'vars', 'sections', 'classes', 'properties'].each do |x|
  if not data.include? x
    puts "The yamlfile must contain the element #{x}."
    exit
  end
end

begin
  template = File.read data['template']
rescue
  puts "The template file doesn't exist."
  exit
end

data['vars'].each do |key,value|
  template.gsub! "{raop.vars.#{key}}", Kramdown::Document.new(value).to_html
  template.gsub! "{raop.vars.#{key} nomarkdown}", value
end

sections_index = ""
sections_data = ""

data['sections'].each_index do |x|
  sections_index += "<li><a href=\"#sec-#{x}\">#{data['sections'][x]['name']}</a></li>"

  sections_data += "<h2 id=\"sec-#{x}\">#{x+1} #{data['sections'][x]['name']}</h2>"
  sections_data += Kramdown::Document.new(data['sections'][x]['content']).to_html
end

sections_index += "<li><a href=\"#sec-cross\">RAOP cross-reference: Listing RAOP Classes and Properties</a></li>"

sections_data += "<h2 id=\"sec-cross\">RAOP cross-reference: Listing RAOP Classes and Properties</h2>"
sections_data += "<p>RAOP introduces the following classes and properties. A machine-friendly version is also available in <a href=\"index.rdf\">RDF/XML</a>.</p>"
sections_data += "<div class=\"azlist\">"

classes = data['classes'].sort_by do |c| c['name'] end
properties = data['properties'].sort_by do |c| c['name'] end

sections_data += "<p>Classes: | "
classes.each do |c|
  sections_data += "<a href=\"#term_#{c['name']}\">#{c['name']}</a> | "
end

sections_data += "</p>Properties: | "
properties.each do |c|
  sections_data += "<a href=\"#term_#{c['name']}\">#{c['name']}</a> | "
end

sections_data += "</p></div>"

template.gsub! "{raop.sections_index}", "<ul>#{sections_index}</ul>"
template.gsub! "{raop.sections_data}", "#{sections_data}"

html = "<div class=\"termlist\"><h3>Classes and Properties (full detail)</h3><div class=\"termdetails\"><br />"

html += "<h2>Classes</h2>"

classes.each do |c|
  html += "<div class=\"specterm classterm\" id=\"term_#{c['name']}\" about=\"https://github.com/bakulf/raop#{c['name']}\" typeof=\"rdfs:Class\">"
  html += "<h3>Class: raop:#{c['name']}</h3>"
  html += "<em>"
  if c.include? 'label'
    html += c['label']
  else
    html += c['name']
  end
  html += "</em> - "

  html += "#{c['comment']}<br />"
  html += "<table style=\"th { float: top; }\">"

  pp = []
  properties.each do |p|
    what = p['domain']
    what = [what] if not what.is_a?(Array)
    what.each do |w|
      pp.push p if w == c['name']
    end
  end

  list = []
  pp.each do |p|
    list.push "<a href=\"#term_#{p['name']}\">#{p['name']}</a>"
  end

  html += "<tr><th>Properties include:</th><td>| #{list.join(" | ")} |</td></tr>" if not list.empty?

  if c.include? 'subclassOf'
    html += "<tr><th>Subclass Of:</th><td>#{find_classes(c['subclassOf'], classes)}</td></tr>"
  end

  if c.include? 'raopCategory'
    html += "<tr><th>Category:</th><td>#{find_classes(c['raopCategory'], classes)}</td></tr>"
  end

  if c.include? 'equivalentClasses'
    html += "<tr><th>Equivalent Classes:</th><td>"
    c['equivalentClasses'].each do |cc|
      html += "<a href=\"#{cc['url']}\">#{cc['name']}</a>"
    end
    html += "</td></tr>"
  end

  html += "</tr></table>"

  if c.include? 'extra'
    html += Kramdown::Document.new(c['extra']).to_html
  end

  html += "<p style=\"float: right; font-size: small;\">[<a href=\"#term_#{c['name']}\">#</a>] [<a href=\"#sec-0\">back to top</a>]</p>"

  if c.include? 'example' and File.exists? c['example']
    file = File.read c['example']

    html += '<br /><div class="example"><pre>'
    html += escape(file)
    html += '</pre></div>'
  end

  html += "<br /></div><br />"
end

html += "<h2>Properties</h2>"

properties.each do |c|
  html += "<div class=\"specterm classterm\" id=\"term_#{c['name']}\" about=\"https://github.com/bakulf/raop#{c['name']}\" typeof=\"rdfs:Class\">"
  html += "<h3>Class: raop:#{c['name']}</h3>"
  html += "<em>"
  if c.include? 'label'
    html += c['label']
  else
    html += c['name']
  end
  html += "</em> - "

  html += "#{c['comment']}<br />"
  html += "<table style=\"th { float: top; }\">"

  if c.include? 'domain'
    html += "<tr><th>Domain:</th><td>having this properties implies being a #{find_classes c['domain'], classes}</td></tr>"
  end

  if c.include? 'range'
    html += "<tr><th>Range:</th><td>every value of this property is a #{find_classes c['range'], classes}</td></tr>"
  end

  html += "</tr></table>"

  if c.include? 'extra'
    html += Kramdown::Document.new(c['extra']).to_html
  end

  html += "<p style=\"float: right; font-size: small;\">[<a href=\"#term_#{c['name']}\">#</a>] [<a href=\"#sec-0\">back to top</a>]</p>"
  html += "<br /></div><br />"

end

classes_and_properties = html
template.gsub! "{raop.classes_and_properties}", "#{classes_and_properties}"

puts template
