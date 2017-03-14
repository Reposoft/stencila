import * as d3 from 'd3'

/**
 * @namespace value
 */

/**
 * Get the type code for a value
 *
 * @memberof value
 * @param {*} value - A JavaScript value
 * @return {string} - Type code for value
 */
export function type (value) {
  let type = typeof value

  if (value === null) {
    return 'null'
  } else if (type === 'boolean') {
    return 'bool'
  } else if (type === 'number') {
    let isInteger = false
    if (value.isInteger) isInteger = value.isInteger()
    else isInteger = (value % 1) === 0
    return isInteger ? 'int' : 'flt'
  } else if (type === 'string') {
    return 'str'
  } else if (type === 'object') {
    if (value.constructor === Array) {
      let onlyObjects = true
      for (let item of value) {
        if (!item || item.constructor !== Object) {
          onlyObjects = false
          break
        }
      }
      if (onlyObjects && value.length > 0) return 'tab'
      else return 'arr'
    }
    if (value.type) return value.type
    else return 'obj'
  } else {
    return 'unk'
  }
}

/**
 * Pack a value into a package
 *
 * @memberof value
 * @param {*} value The Javascript value
 * @return {object} A package as a Javascript object
 */
export function pack (value) {
  // A data pack has a `type`, `format` (defaults to "text")
  // and a `value` (the serialisation of the value into the format)
  let type_ = type(value)
  let format = 'text'
  let content

  if (type_ === 'null') {
    content = 'null'
  } else if (type_ === 'bool' || type_ === 'int' || type_ === 'flt') {
    content = value.toString()
  } else if (type_ === 'str') {
    content = value
  } else if (type_ === 'obj' || type_ === 'arr') {
    format = 'json'
    content = JSON.stringify(value)
  } else if (type_ === 'tab') {
    format = 'csv'
    content = d3.csvFormat(value) + '\n'
  } else if (type_ === 'unk') {
    content = value.toString()
  } else {
    format = 'json'
    content = JSON.stringify(value)
  }
  return {type: type_, format: format, content: content}
}

/**
 * Unpack a data package into an value
 *
 * @memberof value
 * @param {object|string} pkg The package
 * @return {anything} A Javascript value
 */
export function unpack (pkg) {
  if (typeof pkg === 'string') {
    pkg = JSON.parse(pkg)
  }
  if (pkg.constructor !== Object) {
    throw new Error('Package should be an `Object`')
  }
  if (!(pkg.type && pkg.format && pkg.content)) {
    throw new Error('Package should have fields `type`, `format`, `content`')
  }

  let {type, format, content} = pkg

  if (type === 'null') {
    return null
  } else if (type === 'bool') {
    return content === 'true'
  } else if (type === 'int') {
    return parseInt(content, 10)
  } else if (type === 'flt') {
    return parseFloat(content)
  } else if (type === 'str') {
    return content
  } else if (type === 'obj') {
    return JSON.parse(content)
  } else if (type === 'arr') {
    return JSON.parse(content)
  } else if (type === 'tab') {
    if (format === 'csv') {
      return d3.csvParse(content)
    } else if (format === 'tsv') {
      return d3.tsvParse(content)
    } else {
      throw new Error('Unable to unpack\n  type: ' + type + '\n  format: ' + format)
    }
  } else {
    return JSON.parse(content)
  }
}

/**
 * Load a value from a HTML representation
 *
 * This function is used for deserializing cell values from HTML.
 *
 * @param {*} elem - HTML element
 * @return {*} - The value
 */
export function fromHTML (elem) {
  let type = elem.attr('data-value')
  let format = elem.attr('data-format')
  let content
  if (type === 'img') {
    let imageContent
    if (format === 'svg') {
      imageContent = elem.innerHTML
    } else {
      let data = elem.attr('src')
      let match = data.match(/data:image\/([a-z]+);base64,([\w]+)/)
      imageContent = match[2]
    }
    content = JSON.stringify({
      type: 'img',
      format: format,
      content: imageContent
    })
  } else {
    content = elem.innerHTML
  }
  return unpack({
    type: type,
    format: format,
    content: content
  })
}

/**
 * Dump a value to a HTML representation
 *
 * This function is used for serializing cell values to HTML.
 *
 * @param {*} value - Value to convert to HTML
 * @return {string} - HTML string
 */
export function toHTML (value) {
  let type_ = type(value)
  if (type_ === 'img') {
    if (value.format === 'svg') {
      return `<div data-value="img" data-format="svg">${value.content}</div>`
    } else {
      return `<img data-value="img" data-format="${value.format}" src="data:image/${value.format};base64,${value.content}">`
    }
  } else {
    if (typeof value.content === 'undefined') {
      // Do a pack to get a text representation of the value
      let packed = pack(value)
      return `<div data-value="${type_}">${packed.content}</div>`
    } else {
      return `<div data-value="${type_}">${value.content}</div>`
    }
  }
}

/**
 * Load a value from a MIME type/content representation
 *
 * This function is used for deserializing cell values from MIME content
 * (e.g. Jupyter cells).
 *
 * @param {string} mimetype - The MIME type
 * @param {string} content - The MIME content
 * @return {*} - The value
 */
export function fromMime (mimetype, content) {
  if (mimetype === 'image/png') {
    let match = mimetype.match('^image/([a-z]+)$')
    return {
      type: 'img',
      format: match ? match[1] : null,
      content: content
    }
  } else if (mimetype === 'image/svg+xml') {
    return {
      type: 'img',
      format: 'svg',
      content: content
    }
  } else if (mimetype === 'text/html') {
    return {
      type: 'dom',
      format: 'html',
      content: content
    }
  } else if (mimetype === 'text/latex') {
    // Remove any preceding or trailing double dollars
    if (content.substring(0, 2) === '$$') content = content.substring(2)
    if (content.slice(-2) === '$$') content = content.slice(0, -2)
    return {
      type: 'math',
      format: 'latex',
      content: content
    }
  } else {
    return {
      type: 'str',
      format: 'text',
      content: content
    }
  }
}

/**
 * Dump a value to a MIME type/content representation
 *
 * This function is used for serializing cell values to MIME.
 *
 * @param {*} value - Value to convert to HTML
 * @return {object} - MIUME type and content as string
 */
export function toMime (value) {
  let type_ = type(value)
  if (type_ === 'img') {
    return {
      mimetype: `image/${value.format}`,
      content: value.content
    }
  } else {
    let content
    if (typeof value.content === 'undefined') {
      // Do a pack to get a text representation of the value
      content = pack(value).content
    } else {
      // Use the value's content
      content = value.content
    }

    return {
      mimetype: 'text/plain',
      content: content
    }
  }
}
